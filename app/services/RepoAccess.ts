import { and, asc, count, eq, sql } from "drizzle-orm";

import { Security } from "~/app/services/Security.ts";
import { SystemDB } from "~/app/services/SystemDB.ts";
import { Account, User } from "~/drizzle/schema/system.BetterAuth.ts";
import { Repository } from "~/drizzle/schema/system.Repository.ts";
import { UserRepository } from "~/drizzle/schema/system.UserRepository.ts";
import { Service } from "~/lib/service-container/ServiceContainer.ts";

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
	selectRepository(slug: string): void {
		if (this.#slug !== undefined) {
			throw new Error(
				`The repository can only be set once per scope (already "${this.#slug}", attempted "${slug}").`,
			);
		}

		const { userId } = this.security;

		if (!this.hasAccess(userId, slug)) {
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
	createRecordOnlyUser({ name, email }: { name: string; email: string }): RepositoryUser {
		return this.db.transaction((transaction) => {
			const existing = transaction
				.select({ id: User.id })
				.from(User)
				.where(sql`lower(${User.email}) = lower(${email})`)
				.get();

			if (existing) throw new UserEmailAlreadyExistsError(email);

			const repository = transaction
				.select({ id: Repository.id })
				.from(Repository)
				.where(eq(Repository.slug, this.repository))
				.get();

			if (!repository) {
				throw new Error(`Repository "${this.repository}" does not exist.`);
			}

			const id = crypto.randomUUID();
			const now = new Date();

			transaction
				.insert(User)
				.values({ id, name, email, emailVerified: false, createdAt: now, updatedAt: now })
				.run();

			transaction.insert(UserRepository).values({ userId: id, repositoryId: repository.id }).run();

			return { id, name, email, canSignIn: false };
		});
	}

	/**
	 * Whether a grant exists. Grants are held against the repository id. Callers
	 * work with slugs. The query therefore joins through Repository.
	 */
	private hasAccess(userId: string, slug: string): boolean {
		const rows = this.db
			.select({ repositoryId: UserRepository.repositoryId })
			.from(UserRepository)
			.innerJoin(Repository, eq(Repository.id, UserRepository.repositoryId))
			.where(and(eq(UserRepository.userId, userId), eq(Repository.slug, slug)))
			.limit(1)
			.all();

		return rows.length > 0;
	}
}
