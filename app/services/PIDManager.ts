/**
 * Writes the piping and instrumentation diagram of a rig.
 *
 * The route that edits a diagram and the seed both write through this
 * service. A seeded diagram is therefore stored exactly as a saved one.
 */
import { eq } from "drizzle-orm";

import type { PIDGraph } from "~/app/lib/PID.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { PIDEdge } from "~/drizzle/schema/PIDEdge.ts";
import { PIDNode } from "~/drizzle/schema/PIDNode.ts";
import { Service } from "~/lib/service-container/ServiceContainer.ts";

@Service(ApplicationDatabase, Security)
export class PIDManager {
	constructor(
		private db: ApplicationDatabase,
		private security: Security,
	) {}

	/**
	 * Replaces the diagram of one inventory entry with the given graph.
	 *
	 * The graph describes the complete diagram. Symbols and connections that
	 * it does not contain are therefore deleted. The order of the nodes and of
	 * the edges is stored as their drawing order. If one row fails, the
	 * previous diagram remains unchanged.
	 */
	async replace(inventoryEntryId: number, graph: PIDGraph): Promise<void> {
		const createdAt = new Date();
		const creatorId = this.security.userId;

		const nodes = graph.nodes.map((node, drawingOrder) => ({
			id: node.id,
			inventoryEntryId,
			kind: node.kind,
			label: node.label,
			secondaryLabel: node.secondaryLabel,
			parentNodeId: node.parentId,
			drawingOrder,
			inletCount: node.inletCount,
			orientation: node.orientation,
			positionX: node.position.x,
			positionY: node.position.y,
			metadataCreatorId: creatorId,
			metadataCreationTimestamp: createdAt,
		}));

		// A length is carried as one object. It is stored as a value and a unit
		// in two columns.
		const edges = graph.edges.map((edge, drawingOrder) => ({
			id: edge.id,
			inventoryEntryId,
			kind: edge.kind,
			endArrow: edge.endArrow,
			arrowPositions: edge.arrowPositions,
			weight: edge.weight,
			material: edge.material,
			innerDiameterValue: edge.innerDiameter?.value ?? null,
			innerDiameterUnit: edge.innerDiameter?.unit ?? null,
			outerDiameterValue: edge.outerDiameter?.value ?? null,
			outerDiameterUnit: edge.outerDiameter?.unit ?? null,
			lengthValue: edge.length?.value ?? null,
			lengthUnit: edge.length?.unit ?? null,
			sourceNodeId: edge.source,
			targetNodeId: edge.target,
			sourceHandle: edge.sourceHandle,
			targetHandle: edge.targetHandle,
			drawingOrder,
			metadataCreatorId: creatorId,
			metadataCreationTimestamp: createdAt,
		}));

		// Edges reference nodes. They are therefore deleted first and inserted
		// last. Separate inserts avoid a large parameter list per statement.
		await this.db.batch([
			this.db.delete(PIDEdge).where(eq(PIDEdge.inventoryEntryId, inventoryEntryId)),
			this.db.delete(PIDNode).where(eq(PIDNode.inventoryEntryId, inventoryEntryId)),
			...nodes.map((node) => this.db.insert(PIDNode).values(node)),
			...edges.map((edge) => this.db.insert(PIDEdge).values(edge)),
		]);
	}
}
