import { and, eq, inArray, isNull } from "drizzle-orm";

import type { PIDGraph } from "~/app/lib/PID.ts";
import type { SidecarEditorNode } from "~/app/lib/sidecarEditor.ts";
import type { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Channel } from "~/drizzle/schema/Channel.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { Sample } from "~/drizzle/schema/Sample.ts";
import { SampleBatch } from "~/drizzle/schema/SampleBatch.ts";

export async function loadSidecarEditorNodes(db: ApplicationDatabase, graph: PIDGraph) {
	const equipmentIds = [
		...new Set(graph.nodes.flatMap((node) => (node.equipmentId == null ? [] : [node.equipmentId]))),
	];
	const sampleIds = [
		...new Set(graph.nodes.flatMap((node) => (node.sampleId == null ? [] : [node.sampleId]))),
	];
	const equipment = equipmentIds.length
		? await db
				.select({
					id: InventoryEntry.id,
					slug: InventoryEntry.slug,
					serialNumber: InventoryEntry.serialNumber,
					productId: InventoryEntry.productId,
				})
				.from(InventoryEntry)
				.innerJoin(
					Product,
					and(eq(Product.id, InventoryEntry.productId), isNull(Product.metadataArchivedAt)),
				)
				.where(
					and(
						inArray(InventoryEntry.id, equipmentIds),
						eq(InventoryEntry.kind, "equipment"),
						isNull(InventoryEntry.metadataArchivedAt),
					),
				)
				.all()
		: [];
	const productIds = [
		...new Set(equipment.flatMap((item) => (item.productId === null ? [] : [item.productId]))),
	];
	const channels = productIds.length
		? await db
				.select({ productId: Channel.productId, key: Channel.key, role: Channel.role })
				.from(Channel)
				.where(and(inArray(Channel.productId, productIds), isNull(Channel.metadataArchivedAt)))
				.all()
		: [];
	const samples = sampleIds.length
		? await db
				.select({ id: Sample.id, slug: Sample.slug })
				.from(Sample)
				.innerJoin(SampleBatch, eq(SampleBatch.id, Sample.batchId))
				.where(
					and(
						inArray(Sample.id, sampleIds),
						isNull(Sample.metadataArchivedAt),
						isNull(SampleBatch.metadataArchivedAt),
					),
				)
				.all()
		: [];
	const allSampleSlugs = samples.length
		? await db.select({ slug: Sample.slug }).from(Sample).all()
		: [];
	const slugCounts = new Map<string, number>();
	for (const sample of allSampleSlugs)
		slugCounts.set(sample.slug, (slugCounts.get(sample.slug) ?? 0) + 1);

	const nodes: SidecarEditorNode[] = [];
	for (const node of graph.nodes) {
		if (!node.symbolKey) continue;
		if (node.kind === "sample") {
			const sample = samples.find((candidate) => candidate.id === node.sampleId);
			nodes.push({
				id: node.id,
				kind: "sample",
				label: node.label,
				symbolKey: node.symbolKey,
				sample: sample
					? { id: sample.id, slug: slugCounts.get(sample.slug) === 1 ? sample.slug : null }
					: undefined,
			});
			continue;
		}
		const item = equipment.find((candidate) => candidate.id === node.equipmentId);
		nodes.push({
			id: node.id,
			kind: "equipment",
			label: node.label,
			symbolKey: node.symbolKey,
			equipment: item
				? {
						id: item.id,
						slug: item.slug,
						serialNumber: item.serialNumber,
						channels: channels
							.filter((channel) => channel.productId === item.productId)
							.map(({ key, role }) => ({ key, role })),
					}
				: undefined,
		});
	}
	return nodes;
}
