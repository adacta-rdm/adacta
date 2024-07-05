import { eq } from "drizzle-orm";

import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import type { DrizzleTable } from "~/drizzle/DrizzleSchema";

export async function setSpecifications<
	T extends DrizzleTable<
		"DeviceSpecification" | "DeviceDefinitionSpecification" | "SampleSpecification"
	>
>(
	ownerId: T["$inferInsert"]["ownerId"],
	specifications: { name: string; value: string }[],
	Table: T,
	el: EntityLoader
) {
	await el.drizzle.transaction(async (tx) => {
		await tx.delete(Table).where(eq(Table.ownerId, ownerId));
		if (specifications.length === 0) return;
		await tx
			.insert(Table)
			.values(
				specifications.map((s) => ({ ownerId, name: s.name, value: s.value } as T["$inferInsert"]))
			);
	});
}
