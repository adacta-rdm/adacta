/**
 * Loads the piping and instrumentation diagram of a rig from a directory.
 *
 * Each diagram is one file in "seed/presets/<preset>/pid/". The file is named
 * after the inventory entry it describes. For example,
 * "methanation-test-stand.json" describes the entry seeded from
 * "inventory/methanation-test-stand.json".
 *
 * Within a file, each node and each edge carries a "key" instead of an id. A
 * key is unique within its file. A diagram can therefore be written without
 * knowing which ids the database will assign. This module converts each key
 * into an id. It then writes the diagram through PIDManager, as the editor
 * does.
 *
 * A diagram belongs to a rig. A file named after an entry of another kind is
 * an error, because the application draws a P&ID only for a rig.
 */
import { eq } from "drizzle-orm";

import type {
	PIDEdgeKind,
	PIDGraph,
	PIDInletCount,
	PIDOrientation,
	PIDSymbolKind,
} from "~/app/lib/PID.ts";
import { defaultEndArrow, isValidArrowConfiguration } from "~/app/lib/PIDEdgeArrows.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { PIDManager } from "~/app/services/PIDManager.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { jsonFiles, keyOf, readJson } from "~/seed/files.ts";

/**
 * One file in a preset's "pid/" directory has this shape.
 */
type SeedPID = {
	nodes: SeedPIDNode[];
	edges: SeedPIDEdge[];
};

type SeedPIDNode = {
	key: string;
	kind: PIDSymbolKind;
	label: string;
	symbolKey?: string;

	/**
	 * The filename key of the equipment inventory item represented by this symbol.
	 */
	equipment?: string;
	sample?: string;

	/**
	 * The second line of text an instrument carries. Every other symbol omits
	 * this field.
	 */
	secondaryLabel?: string;

	/**
	 * The key of the symbol this one sits inside. Its position is then measured
	 * from the corner of that symbol.
	 */
	parent?: string;

	inletCount?: PIDInletCount;
	orientation: PIDOrientation;
	position: { x: number; y: number };
};

type SeedPIDEdge = {
	key: string;
	kind: PIDEdgeKind;
	endArrow?: boolean;
	arrowPositions?: number[];

	/**
	 * How heavy the line is drawn, from 1 to 3. A line that omits this is drawn
	 * at the lightest weight.
	 */
	weight?: number;

	source: string;
	target: string;
	sourceHandle: string | null;
	targetHandle: string | null;
};

/**
 * Add the diagrams from the seed tree to the database.
 * Returns the number of diagrams written.
 */
export async function seedPID(
	scope: ServiceContainer,
	directory: string,
	entryIds: ReadonlyMap<string, number>,
	sampleIds: ReadonlyMap<string, number> = new Map(),
): Promise<number> {
	const db = scope.get(ApplicationDatabase);
	const files = jsonFiles(directory);
	if (files.length === 0) return 0;
	const equipment = await db
		.select({ id: InventoryEntry.id })
		.from(InventoryEntry)
		.where(eq(InventoryEntry.kind, "equipment"))
		.all();

	// Only equipment files may be linked to symbols. A rig file identifies a diagram.
	const equipmentIds = new Set(equipment.map((item) => item.id));
	const equipmentEntries = new Map([...entryIds].filter(([, id]) => equipmentIds.has(id)));

	for (const file of files) {
		const entryKey = keyOf(file);
		const entryId = entryIds.get(entryKey);

		if (entryId === undefined) {
			throw new Error(`No inventory entry named "${entryKey}.json" for the diagram in ${file}.`);
		}

		const graph = graphOf(readJson<SeedPID>(file), {
			entryId,
			file,
			equipmentEntries,
			sampleIds,
		});
		await scope.get(PIDManager).replace(entryId, graph);
	}

	return files.length;
}

/**
 * Converts one diagram file into the graph that the editor saves.
 *
 * A node id is composed of the entry id and the node key. Two entries can
 * therefore both seed a node named "reactor" without a collision.
 */
function graphOf(
	diagram: SeedPID,
	context: {
		entryId: number;
		file: string;
		equipmentEntries: ReadonlyMap<string, number>;
		sampleIds: ReadonlyMap<string, number>;
	},
): PIDGraph {
	const { entryId, file, equipmentEntries, sampleIds } = context;
	const nodeIds = new Map(
		diagram.nodes.map((node) => [node.key, `pid-node-${entryId}-${node.key}`]),
	);

	// A symbol that sits inside another names it by key, and an edge names its
	// two ends by key. A mistyped key would otherwise reach the database. The
	// resulting error would not name the file that contains it.
	for (const node of diagram.nodes) {
		if (node.parent !== undefined && !nodeIds.has(node.parent)) {
			throw new Error(`Symbol "${node.key}" in ${file} sits inside no symbol "${node.parent}".`);
		}
		if (node.equipment !== undefined && !equipmentEntries.has(node.equipment)) {
			throw new Error(
				`Symbol "${node.key}" in ${file} names no equipment inventory file "${node.equipment}.json".`,
			);
		}
		if (node.sample !== undefined && !sampleIds.has(node.sample)) {
			throw new Error(`Symbol "${node.key}" in ${file} names no sample "${node.sample}".`);
		}
	}

	for (const edge of diagram.edges) {
		for (const end of [edge.source, edge.target]) {
			if (!nodeIds.has(end)) {
				throw new Error(`Connection "${edge.key}" in ${file} names no node "${end}".`);
			}
		}

		const endArrow = edge.endArrow ?? defaultEndArrow(edge.kind);
		const arrowPositions = edge.arrowPositions ?? [];
		if (!isValidArrowConfiguration(edge.kind, endArrow, arrowPositions)) {
			throw new Error(`Connection "${edge.key}" in ${file} has invalid arrow settings.`);
		}
	}

	return {
		nodes: diagram.nodes.map((node) => ({
			id: nodeIds.get(node.key)!,
			kind: node.kind,
			label: node.label,
			symbolKey: node.symbolKey ?? node.key,
			equipmentId: node.equipment === undefined ? null : equipmentEntries.get(node.equipment)!,
			sampleId: node.sample === undefined ? null : sampleIds.get(node.sample)!,
			secondaryLabel: node.secondaryLabel ?? null,
			parentId: node.parent === undefined ? null : nodeIds.get(node.parent)!,
			inletCount: node.inletCount ?? 1,
			orientation: node.orientation,
			position: node.position,
		})),

		// A seed file records no pipe materials or sizes.
		edges: diagram.edges.map((edge) => ({
			id: `pid-edge-${entryId}-${edge.key}`,
			kind: edge.kind,
			endArrow: edge.endArrow ?? defaultEndArrow(edge.kind),
			arrowPositions: edge.arrowPositions ?? [],
			weight: edge.weight ?? 1,
			material: null,
			innerDiameter: null,
			outerDiameter: null,
			length: null,
			source: nodeIds.get(edge.source)!,
			target: nodeIds.get(edge.target)!,
			sourceHandle: edge.sourceHandle,
			targetHandle: edge.targetHandle,
		})),
	};
}
