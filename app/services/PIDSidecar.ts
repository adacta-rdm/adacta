import { and, asc, eq, isNull } from "drizzle-orm";

import {
	buildMeasurementSidecarSkeleton,
	stringifyMeasurementSidecar,
	type SidecarSample,
	type SidecarSkeletonChannel,
} from "~/app/lib/measurementSidecar.ts";
import type { PIDSidecarWarning } from "~/app/lib/sidecarEditor.ts";
import type { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Channel } from "~/drizzle/schema/Channel.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { PIDNode } from "~/drizzle/schema/PIDNode.ts";
import { Product } from "~/drizzle/schema/Product.ts";

/**
 * Derive a portable measurement sidecar skeleton from one rig's P&ID.
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
			productId: InventoryEntry.productId,
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
	const warnings = new Map<string, PIDSidecarWarning>();
	for (const row of rows) {
		if (row.kind === "sample") {
			if (row.sampleId === null || row.symbolKey === null) {
				warnings.set(row.nodeId, {
					nodeId: row.nodeId,
					message:
						row.sampleId === null
							? `${row.label} has no linked sample.`
							: `${row.label} is linked to a sample but has no diagram symbol key.`,
				});
			} else samples.push({ symbol_key: row.symbolKey, id: row.sampleId });
			continue;
		}
		if (row.equipmentId === null) {
			if (row.symbolKey !== null) {
				warnings.set(row.nodeId, {
					nodeId: row.nodeId,
					message: `${row.label} has a diagram symbol key but no linked equipment.`,
				});
			}
			continue;
		}
		if (row.symbolKey === null) {
			warnings.set(row.nodeId, {
				nodeId: row.nodeId,
				message: `${row.label} has no diagram symbol key.`,
			});
			continue;
		}
		if (row.productId === null || row.itemSlug === null) {
			warnings.set(row.nodeId, {
				nodeId: row.nodeId,
				message: `${row.label}'s equipment has no catalog product.`,
			});
			continue;
		}
		if (row.channelKey === null || row.channelRole === null) {
			warnings.set(row.nodeId, {
				nodeId: row.nodeId,
				message: `${row.label}'s product defines no channels.`,
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

	const sidecar = buildMeasurementSidecarSkeleton(channels, operatorEmail, samples);
	return {
		sidecar,
		initialToml: stringifyMeasurementSidecar(sidecar),
		warnings: [...warnings.values()],
	};
}
