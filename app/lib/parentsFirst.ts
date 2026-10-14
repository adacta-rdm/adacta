/**
 * Returns the symbols of a diagram in an order in which each symbol follows
 * the symbol it sits inside. Otherwise, the symbols keep their order. For
 * example, [tap, reactor] with the tap inside the reactor becomes
 * [reactor, tap]. Returns undefined when symbols sit inside each other, for
 * example A inside B and B inside A. No order then puts every symbol after
 * its parent.
 *
 * A parent that is not among the symbols is ignored.
 */
export function parentsFirst<Node extends { id: string; parentId: string | null }>(
	nodes: readonly Node[],
): Node[] | undefined {
	const byId = new Map(nodes.map((node) => [node.id, node]));
	const ordered: Node[] = [];
	const placed = new Set<string>();
	const placing = new Set<string>();

	// Places a node after its parent. A node met again while its parents are
	// being placed sits inside one of its own children.
	function place(node: Node): boolean {
		if (placed.has(node.id)) return true;
		if (placing.has(node.id)) return false;

		placing.add(node.id);
		const parent = node.parentId === null ? undefined : byId.get(node.parentId);
		if (parent !== undefined && !place(parent)) return false;
		placing.delete(node.id);

		placed.add(node.id);
		ordered.push(node);
		return true;
	}

	for (const node of nodes) {
		if (!place(node)) return undefined;
	}

	return ordered;
}
