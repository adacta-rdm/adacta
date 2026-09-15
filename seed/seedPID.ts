/**
 * Loads the piping and instrumentation diagram of a rig from the seed tree.
 *
 * Each diagram is one file in "seed/repo/<repository>/pid/". The file is named
 * after the inventory entry it describes. For example,
 * "methanation-test-stand.json" describes the entry seeded from
 * "inventory/methanation-test-stand.json".
 *
 * Within a file, each node and each edge carries a "key" instead of an id. A
 * key is unique within its file. A diagram can therefore be written without
 * knowing which ids the database will assign. This module converts each key
 * into an id as it inserts the rows.
 *
 * A diagram belongs to a rig. A file named after an entry of another kind is
 * an error, because the application draws a P&ID only for a rig.
 */
import { eq } from "drizzle-orm";

import type { PIDEdgeKind, PIDOrientation, PIDSymbolKind } from "~/app/lib/PID.ts";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import { PIDEdge } from "~/drizzle/schema/repo.PIDEdge.ts";
import { PIDNode } from "~/drizzle/schema/repo.PIDNode.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { jsonFiles, keyOf, readJson } from "~/seed/files.ts";

/**
 * One file in a repository's "pid/" directory has this shape.
 */
type SeedPID = {
	nodes: SeedPIDNode[];
	edges: SeedPIDEdge[];
};

type SeedPIDNode = {
	key: string;
	kind: PIDSymbolKind;
	label: string;
	orientation: PIDOrientation;
	position: { x: number; y: number };
};

type SeedPIDEdge = {
	key: string;
	kind: PIDEdgeKind;
	source: string;
	target: string;
	sourceHandle: string | null;
	targetHandle: string | null;
};

/**
 * Replaces the diagrams of the bound repository with those in the seed tree.
 * Returns the number of diagrams written.
 *
 * The rows of each seeded entry are deleted first. A diagram whose file was
 * removed therefore disappears on the next run.
 */
export async function seedPID(
	scope: ServiceContainer,
	repository: string,
	entryIds: Map<string, number>,
): Promise<number> {
	const db = scope.get(RepoDB);
	const creatorId = scope.get(Security).userId;
	const createdAt = new Date();

	const files = jsonFiles("repo", repository, "pid");
	if (files.length === 0) return 0;

	for (const file of files) {
		const entryKey = keyOf(file);
		const entryId = entryIds.get(entryKey);

		if (entryId === undefined) {
			throw new Error(`No inventory entry named "${entryKey}.json" for the diagram in ${file}.`);
		}

		await writeDiagram(db, readJson<SeedPID>(file), {
			entryId,
			creatorId,
			createdAt,
			file,
		});
	}

	return files.length;
}

/**
 * Writes one diagram and replaces the rows the entry held before.
 *
 * A node id is composed of the entry id and the node key. Two repositories can
 * therefore both seed a node named "reactor" without a collision.
 */
async function writeDiagram(
	db: RepoDB,
	diagram: SeedPID,
	context: { entryId: number; creatorId: string; createdAt: Date; file: string },
): Promise<void> {
	const { entryId, creatorId, createdAt, file } = context;

	const nodeIds = new Map(
		diagram.nodes.map((node) => [node.key, `pid-node-${entryId}-${node.key}`]),
	);

	// An edge names its two ends by key. A mistyped key would otherwise reach
	// the database. The resulting error would not name the file that contains
	// it.
	for (const edge of diagram.edges) {
		for (const end of [edge.source, edge.target]) {
			if (!nodeIds.has(end)) {
				throw new Error(`Connection "${edge.key}" in ${file} names no node "${end}".`);
			}
		}
	}

	await db.transaction(async (transaction) => {
		await transaction.delete(PIDEdge).where(eq(PIDEdge.inventoryEntryId, entryId)).run();
		await transaction.delete(PIDNode).where(eq(PIDNode.inventoryEntryId, entryId)).run();

		if (diagram.nodes.length > 0) {
			await transaction
				.insert(PIDNode)
				.values(
					diagram.nodes.map((node, drawingOrder) => ({
						id: nodeIds.get(node.key)!,
						inventoryEntryId: entryId,
						kind: node.kind,
						label: node.label,
						drawingOrder,
						orientation: node.orientation,
						positionX: node.position.x,
						positionY: node.position.y,
						metadataCreatorId: creatorId,
						metadataCreationTimestamp: createdAt,
					})),
				)
				.run();
		}

		if (diagram.edges.length > 0) {
			await transaction
				.insert(PIDEdge)
				.values(
					diagram.edges.map((edge, drawingOrder) => ({
						id: `pid-edge-${entryId}-${edge.key}`,
						inventoryEntryId: entryId,
						kind: edge.kind,
						sourceNodeId: nodeIds.get(edge.source)!,
						targetNodeId: nodeIds.get(edge.target)!,
						sourceHandle: edge.sourceHandle,
						targetHandle: edge.targetHandle,
						drawingOrder,
						metadataCreatorId: creatorId,
						metadataCreationTimestamp: createdAt,
					})),
				)
				.run();
		}
	});
}
