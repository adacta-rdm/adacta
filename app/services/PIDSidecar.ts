import { and, asc, eq, isNull } from "drizzle-orm";

import {
	buildDatasetSidecarSkeleton,
	stringifyDatasetSidecar,
	type SidecarSample,
	type SidecarSkeletonChannel,
} from "~/app/lib/datasetSidecar.ts";
import type { PIDSidecarOmission } from "~/app/lib/sidecarEditor.ts";
import type { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Channel } from "~/drizzle/schema/Channel.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { PIDNode } from "~/drizzle/schema/PIDNode.ts";
import { Product } from "~/drizzle/schema/Product.ts";

/**
 * Derive a portable dataset sidecar skeleton from one rig's P&ID.
 */
export async function pidSidecarSkeleton(
	db: ApplicationDatabase,
	rigId: number,
	operatorEmail: string,
) {
	const rows = await db
		.select({
			nodeId: PIDNode.id,
			kind: PIDNode.kind,
			label: PIDNode.label,
			symbolKey: PIDNode.symbolKey,
			equipmentId: PIDNode.equipmentEntryId,
			sampleId: PIDNode.sampleId,
			itemSlug: InventoryEntry.slug,
			activeProductId: Product.id,
			channelKey: Channel.key,
			channelRole: Channel.role,
		})
		.from(PIDNode)
		.leftJoin(
			InventoryEntry,
			and(
				eq(InventoryEntry.id, PIDNode.equipmentEntryId),
				eq(InventoryEntry.kind, "equipment"),
				isNull(InventoryEntry.metadataArchivedAt),
			),
		)
		.leftJoin(
			Product,
			and(eq(Product.id, InventoryEntry.productId), isNull(Product.metadataArchivedAt)),
		)
		.leftJoin(Channel, and(eq(Channel.productId, Product.id), isNull(Channel.metadataArchivedAt)))
		.where(and(eq(PIDNode.inventoryEntryId, rigId), isNull(PIDNode.metadataArchivedAt)))
		.orderBy(asc(PIDNode.drawingOrder), asc(Channel.position))
		.all();

	const channels: SidecarSkeletonChannel[] = [];
	const samples: SidecarSample[] = [];
	const omissions = new Map<string, PIDSidecarOmission>();
	for (const row of rows) {
		if (row.kind === "sample") {
			if (row.sampleId === null) continue;
			if (row.symbolKey === null) {
				omissions.set(row.nodeId, {
					nodeId: row.nodeId,
					label: row.label,
					reason: "missing-symbol-key",
				});
			} else samples.push({ symbol_key: row.symbolKey, id: row.sampleId });
			continue;
		}
		if (row.equipmentId === null) continue;
		if (row.symbolKey === null) {
			omissions.set(row.nodeId, {
				nodeId: row.nodeId,
				label: row.label,
				reason: "missing-symbol-key",
			});
			continue;
		}
		if (row.activeProductId === null || row.itemSlug === null) {
			omissions.set(row.nodeId, {
				nodeId: row.nodeId,
				label: row.label,
				reason: "missing-product",
			});
			continue;
		}
		if (row.channelKey === null || row.channelRole === null) {
			omissions.set(row.nodeId, {
				nodeId: row.nodeId,
				label: row.label,
				reason: "missing-channels",
			});
			continue;
		}
		channels.push({
			symbolKey: row.symbolKey,
			itemSlug: row.itemSlug,
			channel: row.channelKey,
			role: row.channelRole,
		});
	}

	const sidecar = buildDatasetSidecarSkeleton(channels, operatorEmail, samples);
	return {
		sidecar,
		initialToml: stringifyDatasetSidecar(sidecar),
		omissions: [...omissions.values()],
	};
}
