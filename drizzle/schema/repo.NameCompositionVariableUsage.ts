import { integer } from "drizzle-orm/pg-core";

import { NameComposition } from "~/drizzle/schema/repo.NameComposition";
import { NameCompositionVariable } from "~/drizzle/schema/repo.NameCompositionVariable";
import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { idType } from "~/drizzle/schemaHelpers/idType";
import type { INameCompositionId, INameCompositionVariableId } from "~/lib/database/Ids";

export function NameCompositionVariableUsage(schemas: IPgSchemas) {
	return schemas.repo.table("NameCompositionVariableUsage", {
		nameCompositionId: idType<INameCompositionId>("name_composition_id")
			.notNull()
			.references(() => NameComposition(schemas).id, { onUpdate: "cascade" }),
		variableId: idType<INameCompositionVariableId>("variable_id")
			.notNull()
			.references(() => NameCompositionVariable(schemas).id, { onUpdate: "cascade" }),
		order: integer("order").notNull(),
	});
}
