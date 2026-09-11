import { CatalogSource } from "~/drizzle/schema/repo.CatalogSource.ts";
import { Channel } from "~/drizzle/schema/repo.Channel.ts";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry.ts";
import { Manufacturer } from "~/drizzle/schema/repo.Manufacturer.ts";
import { PIDEdge } from "~/drizzle/schema/repo.PIDEdge.ts";
import { PIDNode } from "~/drizzle/schema/repo.PIDNode.ts";
import { Product } from "~/drizzle/schema/repo.Product.ts";
import { ProductSeries } from "~/drizzle/schema/repo.ProductSeries.ts";
import { ProductSpecification } from "~/drizzle/schema/repo.ProductSpecification.ts";
import { QuantityKind } from "~/drizzle/schema/repo.QuantityKind.ts";
import { Sample } from "~/drizzle/schema/repo.Sample.ts";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch.ts";
import { SourceArtifact } from "~/drizzle/schema/repo.SourceArtifact.ts";
import { Account, Session, User, Verification } from "~/drizzle/schema/system.BetterAuth.ts";
import { Repository } from "~/drizzle/schema/system.Repository.ts";
import { UserRepository } from "~/drizzle/schema/system.UserRepository.ts";

const Schema = {
	Account,
	CatalogSource,
	Channel,
	InventoryEntry,
	Manufacturer,
	PIDEdge,
	PIDNode,
	Product,
	ProductSeries,
	ProductSpecification,
	QuantityKind,
	Repository,
	Sample,
	SampleBatch,
	Session,
	SourceArtifact,
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
