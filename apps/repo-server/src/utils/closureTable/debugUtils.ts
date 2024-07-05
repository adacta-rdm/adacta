import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import type { ClosureTableSchemas } from "~/apps/repo-server/src/utils/closureTable/closureTableTree";
import { testUUIDtoInteger } from "~/apps/repo-server/testUtils";

export async function treeAsURL(
	el: EntityLoader,
	t: ClosureTableSchemas,
	fn = testUUIDtoInteger,
	filterSelfLinks = true,
	printDirectOnly = true
) {
	return `https://dreampuf.github.io/GraphvizOnline/#${encodeURIComponent(
		await dumpTreeToDot(el, t, filterSelfLinks, printDirectOnly, fn)
	)}`;
}

async function dumpTreeToDot(
	el: EntityLoader,
	t: ClosureTableSchemas,
	filterSelfLinks = true,
	printDirectOnly = true,
	fn = testUUIDtoInteger
) {
	let edges = await el.drizzle.select().from(t);
	if (filterSelfLinks) {
		edges = edges.filter((e) => e.depth > 0);
	}

	if (printDirectOnly) {
		edges = edges.filter((e) => e.depth == 1);
	}

	const edgesString = edges
		.map((e) => `"${fn(e.ancestorId)}" -> "${fn(e.descendantId)}" [label="d: ${e.depth}"];`)
		.join("\n");

	return `digraph G {
	${edgesString}
	}`;
}
