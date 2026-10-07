import { Account, Session, User, Verification } from "~/drizzle/schema/BetterAuth.ts";
import { CatalogSource } from "~/drizzle/schema/CatalogSource.ts";
import { Channel } from "~/drizzle/schema/Channel.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { MeasurementColumn } from "~/drizzle/schema/MeasurementColumn.ts";
import { MeasurementDataset } from "~/drizzle/schema/MeasurementDataset.ts";
import { MeasurementSample } from "~/drizzle/schema/MeasurementSample.ts";
import { Note } from "~/drizzle/schema/Note.ts";
import { NoteAttachment } from "~/drizzle/schema/NoteAttachment.ts";
import { OriginalFile } from "~/drizzle/schema/OriginalFile.ts";
import { PIDEdge } from "~/drizzle/schema/PIDEdge.ts";
import { PIDEdgeKind } from "~/drizzle/schema/PIDEdgeKind.ts";
import { PIDNode } from "~/drizzle/schema/PIDNode.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { ProductSeries } from "~/drizzle/schema/ProductSeries.ts";
import { ProductSpecification } from "~/drizzle/schema/ProductSpecification.ts";
import { QuantityKind } from "~/drizzle/schema/QuantityKind.ts";
import { Sample } from "~/drizzle/schema/Sample.ts";
import { SampleBatch } from "~/drizzle/schema/SampleBatch.ts";

const Schema = {
	Account,
	CatalogSource,
	Channel,
	Id,
	InventoryEntry,
	Manufacturer,
	MeasurementColumn,
	MeasurementDataset,
	MeasurementSample,
	Note,
	NoteAttachment,
	OriginalFile,
	PIDEdge,
	PIDEdgeKind,
	PIDNode,
	Product,
	ProductSeries,
	ProductSpecification,
	QuantityKind,
	Sample,
	SampleBatch,
	Session,
	User,
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
