import { and, eq } from "drizzle-orm";

import { Security } from "~/app/services/Security";
import { SystemDB } from "~/app/services/SystemDB";
import { Repository } from "~/drizzle/schema/system.Repository";
import { UserRepository } from "~/drizzle/schema/system.UserRepository";
import { Service } from "~/lib/serviceContainer/ServiceContainer";

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
 * The repository a scope works on, and the only way to bind one.
 *
 * A scope works on exactly one repository. Access is by grant, recorded in the
 * system `UserRepository` table, so binding always means checking the grant of
 * the authenticated user first. The selection is held here, so there is no way
 * to reach a repository without passing that check.
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
