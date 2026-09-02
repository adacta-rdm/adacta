import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry";
import { SourceArtifact } from "~/drizzle/schema/repo.SourceArtifact";
import { SourceBundle } from "~/drizzle/schema/repo.SourceBundle";
import { Account, Session, User, Verification } from "~/drizzle/schema/system.BetterAuth";
import { Repository } from "~/drizzle/schema/system.Repository";
import { UserRepository } from "~/drizzle/schema/system.UserRepository";

const Schema = {
	Account,
	InventoryEntry,
	Repository,
	Session,
	SourceArtifact,
	SourceBundle,
	User,
	UserRepository,
	Verification,
} as const;

export type EntityName = keyof typeof Schema;

/**
 * A complete row selected from a registered table.
 */
export type Entity<Name extends EntityName> = (typeof Schema)[Name]["$inferSelect"];

/**
 * Values accepted when inserting a row into a registered table.
 */
export type NewEntity<Name extends EntityName> = (typeof Schema)[Name]["$inferInsert"];
