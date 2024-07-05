import { integer, primaryKey } from "drizzle-orm/pg-core";

import { DeviceDefinition } from "~/drizzle/schema/repo.DeviceDefinition";
import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { idType } from "~/drizzle/schemaHelpers/idType";
import type { IDeviceDefinitionId } from "~/lib/database/Ids";

export function DeviceDefinitionPaths(schemas: IPgSchemas) {
	return schemas.repo.table(
		"DeviceDefinitionPaths",
		{
			ancestorId: idType<IDeviceDefinitionId>("ancestor_id")
				.references(() => DeviceDefinition(schemas).id)
				.notNull(),
			descendantId: idType<IDeviceDefinitionId>("descendant_id")
				.references(() => DeviceDefinition(schemas).id)
				.notNull(),
			depth: integer("depth").notNull(), // Swap to smallint?
		},
		(t) => ({
			pk: primaryKey({ columns: [t.ancestorId, t.descendantId] }),
		})
	);
}
