import { eq, notInArray } from "drizzle-orm";

import { QUANTITY_KINDS } from "~/app/lib/quantities.ts";
import { DatabaseManager } from "~/app/services/DatabaseManager.ts";
import { SystemDB } from "~/app/services/SystemDB.ts";
import { QuantityKind } from "~/drizzle/schema/repo.QuantityKind.ts";
import { Repository } from "~/drizzle/schema/system.Repository.ts";
import { UserRepository } from "~/drizzle/schema/system.UserRepository.ts";
import { Service } from "~/lib/service-container/ServiceContainer.ts";

/**
 * Manages repository records.
 *
 * The system database stores which repositories exist and who may open them.
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
	repositories(): string[] {
		return this.system
			.select({ slug: Repository.slug })
			.from(Repository)
			.all()
			.map((row) => row.slug);
	}

	/**
	 * Creates a repository database and then records it in the system database.
	 *
	 * @throws InvalidDatabaseNameError if the slug is not a safe file name.
	 * @throws RepositoryAlreadyExistsError if the slug is taken.
	 */
	createRepository(slug: string, name = slug): void {
		if (this.find(slug)) {
			throw new RepositoryAlreadyExistsError(slug);
		}

		// Validate and migrate the repository database before writing its system
		// record. An invalid slug is therefore rejected before the repository is
		// recorded.
		this.databases.migrateRepository(slug);
		this.loadVocabularies(slug);

		this.system.insert(Repository).values({ slug, name, createdAt: new Date() }).run();
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
	deleteRepository(slug: string): void {
		if (!this.find(slug)) {
			throw new RepositoryNotFoundError(slug);
		}

		this.system.delete(Repository).where(eq(Repository.slug, slug)).run();

		this.databases.dropRepository(slug);
	}

	/**
	 * Applies pending migrations to the system database and all repository
	 * databases. It then synchronizes the quantity-kind list in each repository.
	 */
	migrateAll(): void {
		this.databases.migrateSystem();

		for (const slug of this.repositories()) {
			this.databases.migrateRepository(slug);
			this.loadVocabularies(slug);
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

	/**
	 * Synchronizes the application's quantity-kind list with one repository
	 * database.
	 *
	 * This runs after the repository is migrated. The application list is
	 * authoritative. A repository receives new kinds during its next migration,
	 * therefore a new kind does not require a migration file. Running this method
	 * again with the same list leaves the database unchanged.
	 *
	 * Each row stores only the kind's name. Existing rows therefore need no
	 * update. The method changes only the set of names.
	 *
	 * The method removes kinds absent from the application list. A foreign key
	 * prevents removal while a channel refers to the kind. Such a kind can be
	 * retired only after its channels refer to a different kind.
	 */
	private loadVocabularies(slug: string): void {
		const db = this.databases.repoDb(slug);
		const quantityKinds = Object.keys(QUANTITY_KINDS);

		db.delete(QuantityKind).where(notInArray(QuantityKind.id, quantityKinds)).run();

		db.insert(QuantityKind)
			.values(quantityKinds.map((id) => ({ id })))
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
