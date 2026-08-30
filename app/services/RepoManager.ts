import { eq } from "drizzle-orm";

import { DatabaseManager } from "~/app/services/DatabaseManager";
import { SystemDB } from "~/app/services/SystemDB";
import { Repository } from "~/drizzle/schema/system.Repository";
import { UserRepository } from "~/drizzle/schema/system.UserRepository";
import { Service } from "~/lib/serviceContainer/ServiceContainer";

/**
 * Repositories as records: which ones exist and who may open them.
 *
 * DatabaseManager creates and migrates the files. This calls into it when a
 * repository is created. A repository without its database is not usable.
 */
@Service(SystemDB, DatabaseManager)
export class RepoManager {
	constructor(
		private system: SystemDB,
		private databases: DatabaseManager,
	) {}

	/**
	 * Every repository slug known to the system database.
	 */
	repositories(): string[] {
		return this.system
			.select({ slug: Repository.slug })
			.from(Repository)
			.all()
			.map((row) => row.slug);
	}

	/**
	 * Create a repository: record it, then build its database.
	 *
	 * @throws InvalidDatabaseNameError if the slug is not a safe file name.
	 * @throws RepositoryAlreadyExistsError if the slug is taken.
	 */
	createRepository(slug: string, name = slug): void {
		if (this.find(slug)) {
			throw new RepositoryAlreadyExistsError(slug);
		}

		// Migrating first means an invalid slug is rejected before anything is
		// recorded. A failed creation therefore leaves nothing behind.
		this.databases.migrateRepository(slug);

		this.system.insert(Repository).values({ slug, name, createdAt: new Date() }).run();
	}

	/**
	 * Delete a repository: forget the record, then remove its database.
	 *
	 * The record goes first. An orphaned file is invisible to the application,
	 * while a record whose database is gone breaks every request that opens it.
	 * The foreign key deletes the grants together with the record.
	 *
	 * @throws RepositoryNotFoundError if no such repository exists.
	 */
	deleteRepository(slug: string): void {
		if (!this.find(slug)) {
			throw new RepositoryNotFoundError(slug);
		}

		this.system.delete(Repository).where(eq(Repository.slug, slug)).run();

		this.databases.dropRepository(slug);
	}

	/**
	 * Apply pending migrations to the system database and every repository.
	 */
	migrateAll(): void {
		this.databases.migrateSystem();

		for (const slug of this.repositories()) {
			this.databases.migrateRepository(slug);
		}
	}

	/**
	 * Give the user access to the repository. Granting twice is not an error.
	 *
	 * The grant is written to the system database. No repository has to be bound
	 * to a scope. `RepoAccess` reads these rows when a scope selects its
	 * repository.
	 *
	 * @throws RepositoryNotFoundError if no such repository exists.
	 */
	grantAccess(userId: string, slug: string): void {
		const repository = this.find(slug);

		if (!repository) {
			throw new RepositoryNotFoundError(slug);
		}

		this.system
			.insert(UserRepository)
			.values({ userId, repositoryId: repository.id })
			.onConflictDoNothing()
			.run();
	}

	private find(slug: string) {
		return this.system.select().from(Repository).where(eq(Repository.slug, slug)).get();
	}
}

export class RepositoryAlreadyExistsError extends Error {
	constructor(public readonly repository: string) {
		super(`Repository "${repository}" already exists.`);
		this.name = "RepositoryAlreadyExistsError";
	}
}

export class RepositoryNotFoundError extends Error {
	constructor(public readonly repository: string) {
		super(`Repository "${repository}" does not exist.`);
		this.name = "RepositoryNotFoundError";
	}
}
