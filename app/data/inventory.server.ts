import { and, eq, isNull } from "drizzle-orm";

import type { InventoryEntry } from "~/app/data/types";
import { getRepoDb } from "~/app/db/connect.server";
import { InventoryEntry as InventoryEntryTable } from "~/drizzle/schema/repo.InventoryEntry";

/**
 * Soft-deleted rows are never returned.
 */
export function listInventory(slug: string): InventoryEntry[] {
	return getRepoDb(slug)
		.select()
		.from(InventoryEntryTable)
		.where(isNull(InventoryEntryTable.metadataDeletedAt))
		.all()
		.map(toEntry);
}

export function findInventoryEntry(slug: string, id: number): InventoryEntry | undefined {
	const row = getRepoDb(slug)
		.select()
		.from(InventoryEntryTable)
		.where(and(eq(InventoryEntryTable.id, id), isNull(InventoryEntryTable.metadataDeletedAt)))
		.get();

	return row ? toEntry(row) : undefined;
}

function toEntry(row: typeof InventoryEntryTable.$inferSelect): InventoryEntry {
	return {
		id: row.id,
		name: row.name,
		kind: row.kind,
		location: {
			building: row.locationBuildingIdentifier,
			room: row.locationRoomIdentifier,
			label: row.locationLabel,
		},
	};
}
