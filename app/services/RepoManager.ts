import { eq, notInArray } from "drizzle-orm";

import { PID_EDGE_KINDS } from "~/app/lib/PID.ts";
import { QUANTITY_KINDS } from "~/app/lib/quantities.ts";
import { DatabaseManager } from "~/app/services/DatabaseManager.ts";
import { SystemDB } from "~/app/services/SystemDB.ts";
import { PIDEdgeKind } from "~/drizzle/schema/repo.PIDEdgeKind.ts";
import { QuantityKind } from "~/drizzle/schema/repo.QuantityKind.ts";
import { Repository } from "~/drizzle/schema/system.Repository.ts";
import { UserRepository } from "~/drizzle/schema/system.UserRepository.ts";
import { Service } from "~/lib/service-container/ServiceContainer.ts";

/**
 * Manages repository records.
 *
 * The system database stores which repositories exist and their users.
 * DatabaseManager creates and migrates each repository database. RepoManager
 * calls it when a repository is created. A repository is usable only when its
 * database exists.
 */
@Service(SystemDB, DatabaseManager)
export class RepoManager {
	constructor(
		private system: SystemDB,
		private databases: DatabaseManager,
	) {}

	/**
	 * Returns every repository slug recorded in the system database.
	 */
	async repositories(): Promise<string[]> {
		return (await this.system.select({ slug: Repository.slug }).from(Repository).all()).map(
			(row) => row.slug,
		);
	}

	/**
	 * Creates a repository database and then records it in the system database.
	 *
	 * @throws InvalidDatabaseNameError if the slug is not a safe file name.
	 * @throws RepositoryAlreadyExistsError if the slug is taken.
	 */
	async createRepository(slug: string, name = slug): Promise<void> {
		if (await this.find(slug)) {
			throw new RepositoryAlreadyExistsError(slug);
		}

		// Validate and migrate the repository database before writing its system
		// record. An invalid slug is therefore rejected before the repository is
		// recorded.
		await this.databases.migrateRepository(slug);
		await this.loadVocabularies(slug);

		await this.system.insert(Repository).values({ slug, name, createdAt: new Date() }).run();
	}

	/**
	 * Deletes a repository record and its database.
	 *
	 * The system record is deleted first. A database without a record is
	 * inaccessible through the application. A record without its database would
	 * cause requests to fail. The foreign key deletes access grants with the
	 * repository record.
	 *
	 * @throws RepositoryNotFoundError if no such repository exists.
	 */
	async deleteRepository(slug: string): Promise<void> {
		if (!(await this.find(slug))) {
			throw new RepositoryNotFoundError(slug);
		}

		await this.system.delete(Repository).where(eq(Repository.slug, slug)).run();

		await this.databases.dropRepository(slug);
	}

	/**
	 * Applies pending migrations to the system database and all repository
	 * databases. It then synchronizes the fixed lists in each repository.
	 */
	async migrateAll(): Promise<void> {
		await this.databases.migrateSystem();

		for (const slug of await this.repositories()) {
			await this.databases.migrateRepository(slug);
			await this.loadVocabularies(slug);
		}
	}

	/**
	 * Grants a user access to a repository. Repeating the grant has no effect.
	 *
	 * The grant is stored in the system database. `RepoAccess` reads it when a
	 * request selects a repository.
	 *
	 * @throws RepositoryNotFoundError if no such repository exists.
	 */
	async grantAccess(userId: string, slug: string): Promise<void> {
		const repository = await this.find(slug);

		if (!repository) {
			throw new RepositoryNotFoundError(slug);
		}

		await this.system
			.insert(UserRepository)
			.values({ userId, repositoryId: repository.id })
			.onConflictDoNothing()
			.run();
	}

	/**
	 * Synchronizes the application's fixed lists with one repository database.
	 *
	 * This runs after the repository is migrated. The application list is
	 * authoritative. A repository receives new entries during its next migration,
	 * therefore a new entry does not require a migration file. Running this method
	 * again with the same lists leaves the database unchanged.
	 *
	 * Each row stores only the entry's name. Existing rows therefore need no
	 * update. The method changes only the set of names.
	 *
	 * The method removes entries absent from the application list. A foreign key
	 * prevents removal while a record refers to the entry. Such an entry can be
	 * retired only after those records refer to a different one.
	 */
	private async loadVocabularies(slug: string): Promise<void> {
		const db = this.databases.repoDb(slug);

		await this.loadVocabulary(db, QuantityKind, Object.keys(QUANTITY_KINDS));
		await this.loadVocabulary(db, PIDEdgeKind, Object.keys(PID_EDGE_KINDS));
	}

	/**
	 * Brings one vocabulary table in line with the names the application lists.
	 *
	 * The table holds a single "id" column. Adding and removing rows is therefore
	 * all the synchronization a vocabulary needs.
	 */
	private async loadVocabulary(
		db: ReturnType<DatabaseManager["repoDb"]>,
		table: typeof QuantityKind | typeof PIDEdgeKind,
		names: string[],
	): Promise<void> {
		await db.delete(table).where(notInArray(table.id, names)).run();

		await db
			.insert(table)
			.values(names.map((id) => ({ id })))
			.onConflictDoNothing()
			.run();
	}

	private async find(slug: string) {
		return await this.system.select().from(Repository).where(eq(Repository.slug, slug)).get();
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
