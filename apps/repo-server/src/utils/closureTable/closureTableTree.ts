import { and, eq, sql } from "drizzle-orm";

import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import type { DrizzleTable } from "~/drizzle/DrizzleSchema";
import type { IDeviceDefinitionId } from "~/lib/database/Ids";

export type ClosureTableSchemas = DrizzleTable<"DeviceDefinitionPaths">;

export async function closureTableInsert(
	el: EntityLoader,
	t: ClosureTableSchemas,
	parent: IDeviceDefinitionId, // Infer type...
	child: IDeviceDefinitionId
) {
	return el.drizzle.transaction(async (tx) => {
		// Make sure the parent is already in the tree to be able to insert the child and link to it
		await tx
			.insert(t)
			.values({ descendantId: parent, ancestorId: parent, depth: 0 })
			.onConflictDoNothing();

		// The Antipatterns book talks about inserting the child self-relation using a UNION ALL.
		// This causes issues if the child is already in the tree.
		await tx
			.insert(t)
			.values({ descendantId: child, ancestorId: child, depth: 0 })
			.onConflictDoNothing();

		const child_uuid = castStringToUUID(child);
		const parent_uuid = castStringToUUID(parent);

		// Most operations are adapted from the Antipatterns book.
		// This query is different as it looks like the original query is only working if the parent
		// is a leaf.
		// https://fueled.com/the-cache/posts/backend/closure-table/
		// No drizzle query builder here, as it looks like drizzle does not support INSERT INTO
		// with SELECT
		const query = sql`INSERT into ${t}(ancestor_id, descendant_id, depth)
						  SELECT p.ancestor_id, c.descendant_id, p.depth + c.depth + 1
						  FROM ${t} p,
							   ${t} c
						  WHERE p.descendant_id = ${parent_uuid}
							and c.ancestor_id = ${child_uuid}`;

		await tx.execute(query);
	});
}

export async function closureTableMoveSubtree(
	el: EntityLoader,
	t: ClosureTableSchemas,
	childId: IDeviceDefinitionId,
	newParentId: IDeviceDefinitionId
) {
	return el.drizzle.transaction(async (tx) => {
		const definitionToMove = childId; // Useless here (?)

		// Ensure that the parent is in the closure table
		await tx
			.insert(t)
			.values({
				ancestorId: newParentId,
				descendantId: newParentId,
				depth: 0,
			})
			.onConflictDoNothing();

		// Cut the subtree from the current parent
		await closureTableCutSubtree(tx, t, definitionToMove);

		// Reinsert the subtree at its new location
		// No drizzle query builder here, as it looks like drizzle does not support CROSS JOIN and
		// also does not support combining INSERT INTO with SELECT
		const reinsertValue = sql`
			SELECT supertree.ancestor_id, subtree.descendant_id, supertree.depth + subtree.depth + 1
			FROM ${t} AS supertree
					 CROSS JOIN ${t} AS subtree
			WHERE supertree.descendant_id = ${newParentId}
			  AND subtree.ancestor_id = ${definitionToMove};
		`;
		const reinsertQuery = sql`
			INSERT INTO ${t} (ancestor_id, descendant_id, depth)
				${reinsertValue};
		`;

		await tx.execute(reinsertQuery);
	});
}

export async function closureTableCutSubtree(
	drizzle: EntityLoader["drizzle"], // Using the drizzle instance directly to allow usage in transactions
	t: ClosureTableSchemas,
	definitionToMove: IDeviceDefinitionId
) {
	// No drizzle query builder here, as it looks like drizzle does not support the `IN (SELECT`
	// part we are relying on here.
	const deleteQuery = sql`DELETE
                            FROM ${t}
                            WHERE ${t.descendantId} IN (SELECT ${t.descendantId}
                                                        FROM ${t}
                                                        WHERE ${t.ancestorId} = ${definitionToMove})
                              AND ${t.ancestorId} IN (SELECT ${t.ancestorId}
                                                      FROM ${t}
                                                      WHERE ${t.descendantId} = ${definitionToMove}
                                                        AND ${t.ancestorId} != ${t.descendantId})`;
	await drizzle.execute(deleteQuery);
}

export function closureTableDeleteSubtree(
	el: EntityLoader,
	t: ClosureTableSchemas,
	definitionId: IDeviceDefinitionId
) {
	// No drizzle query builder here, as it looks like drizzle does not support the `IN (SELECT`
	// part we are relying on here.
	const query = sql`DELETE
                      FROM ${t}
                      WHERE ${t.descendantId} IN (SELECT ${t.descendantId}
                                                  FROM ${t}
                                                  WHERE ${t.ancestorId} = ${definitionId});`;

	return el.drizzle.execute(query);
}

export function closureTableDeleteLeaf(
	el: EntityLoader,
	t: ClosureTableSchemas,
	id: IDeviceDefinitionId
) {
	return el.drizzle.delete(t).where(eq(t.descendantId, id)).execute();
}

/**
 * Helper function to set the parent of a Node in a tree modeled as a closure table.
 */
export async function closureTableSetParent(
	deviceDefinitionId: IDeviceDefinitionId,
	parent: IDeviceDefinitionId | undefined,
	el: EntityLoader,
	t: ClosureTableSchemas
) {
	const currentParents = await el.drizzle
		.select({ id: t.ancestorId })
		.from(t)
		.where(and(eq(t.descendantId, deviceDefinitionId), eq(t.depth, 1)));

	if (currentParents.length > 1) {
		throw new Error("More than one parent found");
	}

	if (currentParents.length === 1 && currentParents[0].id === parent) {
		return;
	}

	if (currentParents.length === 0 && parent) {
		// Simply insert as leaf there are no parents right now
		await closureTableInsert(el, t, parent, deviceDefinitionId);
	} else if (parent) {
		// Cut loose
		await closureTableMoveSubtree(el, t, deviceDefinitionId, parent);
	} else {
		await closureTableCutSubtree(el.drizzle, t, deviceDefinitionId);
	}
}

// Required to treat a string which is embedded in the query as UUID for reinsertion
// (i.e. `SELECT UUID_AS_STRING_HERE`)
function castStringToUUID(thing: string) {
	return sql<string>`cast
        (${thing} as uuid)`;
}
