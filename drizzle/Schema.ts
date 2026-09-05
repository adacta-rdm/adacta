import { CatalogSource } from "~/drizzle/schema/repo.CatalogSource";
import { Channel } from "~/drizzle/schema/repo.Channel";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry";
import { Manufacturer } from "~/drizzle/schema/repo.Manufacturer";
import { Product } from "~/drizzle/schema/repo.Product";
import { ProductSeries } from "~/drizzle/schema/repo.ProductSeries";
import { ProductSpecification } from "~/drizzle/schema/repo.ProductSpecification";
import { Sample } from "~/drizzle/schema/repo.Sample";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch";
import { SourceArtifact } from "~/drizzle/schema/repo.SourceArtifact";
import { SourceBundle } from "~/drizzle/schema/repo.SourceBundle";
import { Account, Session, User, Verification } from "~/drizzle/schema/system.BetterAuth";
import { Repository } from "~/drizzle/schema/system.Repository";
import { UserRepository } from "~/drizzle/schema/system.UserRepository";

const Schema = {
	Account,
	CatalogSource,
	Channel,
	InventoryEntry,
	Manufacturer,
	Product,
	ProductSeries,
	ProductSpecification,
	Repository,
	Sample,
	SampleBatch,
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
