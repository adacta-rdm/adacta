import { and, asc, eq } from "drizzle-orm";

import { Security } from "~/app/services/Security";
import { SystemDB } from "~/app/services/SystemDB";
import { User } from "~/drizzle/schema/system.BetterAuth";
import { Repository } from "~/drizzle/schema/system.Repository";
import { UserRepository } from "~/drizzle/schema/system.UserRepository";
import { Service } from "~/lib/service-container/ServiceContainer";

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
	 * The users who may open the bound repository, ordered by name.
	 *
	 * For example, a form that credits one of them as the author of a record
	 * offers this list. Two users with the same name are ordered by id. The
	 * order is therefore stable.
	 */
	async users(): Promise<{ id: string; name: string }[]> {
		return this.db
			.select({ id: User.id, name: User.name })
			.from(User)
			.innerJoin(UserRepository, eq(UserRepository.userId, User.id))
			.innerJoin(Repository, eq(Repository.id, UserRepository.repositoryId))
			.where(eq(Repository.slug, this.repository))
			.orderBy(asc(User.name), asc(User.id));
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
