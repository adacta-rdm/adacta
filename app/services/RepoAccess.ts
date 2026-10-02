import { and, asc, count, eq } from "drizzle-orm";

import { Security } from "~/app/services/Security.ts";
import { SystemDB } from "~/app/services/SystemDB.ts";
import { Account, User } from "~/drizzle/schema/system.BetterAuth.ts";
import { Repository } from "~/drizzle/schema/system.Repository.ts";
import { UserRepository } from "~/drizzle/schema/system.UserRepository.ts";
import { Service } from "~/lib/service-container/ServiceContainer.ts";
import { isUniqueConstraintOn } from "~/lib/sqlite-errors/isUniqueConstraintOn.ts";

/**
 * The scope's authenticated user holds no grant for the repository.
 */
export class RepositoryAccessDeniedError extends Error {
	constructor(
		public readonly userId: string,
		public readonly repository: string,
	) {
		super(`User "${userId}" does not have access to repository "${repository}".`);
		this.name = "RepositoryAccessDeniedError";
	}
}

/**
 * An email address already identifies a user in the system database.
 */
export class UserEmailAlreadyExistsError extends Error {
	constructor(public readonly email: string) {
		super(`A user with the email address "${email}" already exists.`);
		this.name = "UserEmailAlreadyExistsError";
	}
}

export type RepositoryUser = {
	id: string;
	name: string;
	email: string;
	canSignIn: boolean;
};

/**
 * The repository a scope works on. This is the only place that binds one.
 *
 * A scope works on exactly one repository. Access is given by a grant. Grants
 * are recorded in the system `UserRepository` table. Binding therefore checks
 * the grant of the authenticated user first. The selection is held here. No
 * code can reach a repository without passing that check.
 *
 * `RepoManager` writes the grants. It administers repositories and takes a slug
 * for each call. The grants are read here, where the slug is the bound one. A
 * caller can therefore not ask about a repository it was not given.
 */
@Service(SystemDB, Security)
export class RepoAccess {
	#slug: string | undefined;

	constructor(
		private db: SystemDB,
		private security: Security,
	) {}

	/**
	 * Bind `slug` to this scope. The authenticated user must be allowed to open
	 * it.
	 *
	 * The grant is checked first. A rejected selection therefore leaves the
	 * scope unbound. The repository is set exactly once. The container installs
	 * a fresh instance for each request. A second call is a mistake in the
	 * request flow.
	 *
	 * @throws RepositoryAccessDeniedError if the user holds no grant.
	 */
	async selectRepository(slug: string): Promise<void> {
		if (this.#slug !== undefined) {
			throw new Error(
				`The repository can only be set once per scope (already "${this.#slug}", attempted "${slug}").`,
			);
		}

		const { userId } = this.security;

		if (!(await this.hasAccess(userId, slug))) {
			throw new RepositoryAccessDeniedError(userId, slug);
		}
		this.#slug = slug;
	}

	/**
	 * The bound repository slug. Throws when nothing is bound yet.
	 *
	 * A missing repository is not returned as `undefined`. A caller cannot do
	 * anything useful without a repository.
	 */
	get repository(): string {
		if (this.#slug === undefined) {
			throw new Error(
				"No repository is available. Ensure the repositoryAccess middleware ran for this scope.",
			);
		}

		return this.#slug;
	}

	/**
	 * Returns the users associated with the bound repository, ordered by name.
	 *
	 * For example, a form that credits one of them as the author of a record
	 * offers this list. Two users with the same name are ordered by id. The
	 * order is therefore stable.
	 */
	async users(): Promise<{ id: string; name: string }[]> {
		return (await this.repositoryUsers()).map(({ id, name }) => ({ id, name }));
	}

	/**
	 * Returns the users shown in the repository directory.
	 *
	 * A user can be credited in repository records without holding a sign-in
	 * account. The account state is therefore returned separately from the user
	 * identity.
	 */
	async repositoryUsers(): Promise<RepositoryUser[]> {
		const rows = await this.db
			.select({
				id: User.id,
				name: User.name,
				email: User.email,
				accountCount: count(Account.id),
			})
			.from(User)
			.innerJoin(UserRepository, eq(UserRepository.userId, User.id))
			.innerJoin(Repository, eq(Repository.id, UserRepository.repositoryId))
			.leftJoin(Account, eq(Account.userId, User.id))
			.where(eq(Repository.slug, this.repository))
			.groupBy(User.id, User.name, User.email)
			.orderBy(asc(User.name), asc(User.id));

		return rows.map(({ accountCount, ...user }) => ({
			...user,
			canSignIn: accountCount > 0,
		}));
	}

	/**
	 * Create a user who can be credited in the bound repository.
	 *
	 * No account is created. The user therefore cannot sign in. A later
	 * invitation can add an account to the same identity.
	 *
	 * @throws UserEmailAlreadyExistsError if the email address is already used.
	 */
	async createRecordOnlyUser({
		name,
		email,
	}: {
		name: string;
		email: string;
	}): Promise<RepositoryUser> {
		// Better Auth stores emails in lower case. We do the same. Then the unique
		// index also rejects "Ada@example.com" if "ada@example.com" exists.
		email = email.toLowerCase();

		// If the repository is deleted after this read, the foreign key rejects
		// the insert.
		const repository = await this.db
			.select({ id: Repository.id })
			.from(Repository)
			.where(eq(Repository.slug, this.repository))
			.get();

		if (!repository) {
			throw new Error(`Repository "${this.repository}" does not exist.`);
		}

		const id = crypto.randomUUID();
		const now = new Date();

		// We insert the user ourselves. The public Better Auth API only creates
		// users who can log in. Its internal API writes outside this batch.
		// If the membership insert then fails, the email stays taken.
		try {
			await this.db.batch([
				this.db
					.insert(User)
					.values({ id, name, email, emailVerified: false, createdAt: now, updatedAt: now }),
				this.db.insert(UserRepository).values({ userId: id, repositoryId: repository.id }),
			]);
		} catch (error) {
			// The unique index decides whether the address is taken. A check
			// before the insert cannot decide. Another request can insert the same
			// address in between.
			if (isUniqueConstraintOn(error, [User.email])) {
				throw new UserEmailAlreadyExistsError(email);
			}

			throw error;
		}

		return { id, name, email, canSignIn: false };
	}

	/**
	 * Whether a grant exists. Grants are held against the repository id. Callers
	 * work with slugs. The query therefore joins through Repository.
	 */
	private async hasAccess(userId: string, slug: string): Promise<boolean> {
		const rows = await this.db
			.select({ repositoryId: UserRepository.repositoryId })
			.from(UserRepository)
			.innerJoin(Repository, eq(Repository.id, UserRepository.repositoryId))
			.where(and(eq(UserRepository.userId, userId), eq(Repository.slug, slug)))
			.limit(1)
			.all();

		return rows.length > 0;
	}
}
