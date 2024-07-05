import type { ReferenceConfig } from "drizzle-orm/pg-core";
import { primaryKey, varchar } from "drizzle-orm/pg-core";

import { Device } from "~/drizzle/schema/repo.Device";
import { DeviceDefinition } from "~/drizzle/schema/repo.DeviceDefinition";
import { Sample } from "~/drizzle/schema/repo.Sample";
import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { idType } from "~/drizzle/schemaHelpers/idType";

export function DeviceSpecification(schemas: IPgSchemas) {
	return specifications("DeviceSpecification", () => Device(schemas).id, schemas);
}

export function DeviceDefinitionSpecification(schemas: IPgSchemas) {
	return specifications(
		"DeviceDefinitionSpecification",
		() => DeviceDefinition(schemas).id,
		schemas
	);
}

export function SampleSpecification(schemas: IPgSchemas) {
	return specifications("SampleSpecification", () => Sample(schemas).id, schemas);
}

function specifications<T>(
	name: string,
	ownerReference: ReferenceConfig["ref"],
	schemas: IPgSchemas
) {
	return schemas.repo.table(
		name,
		{
			name: varchar("name", { length: 255 }).notNull(),
			value: varchar("value", { length: 255 }).notNull(),
			ownerId: idType<T>("owner_id").references(ownerReference).notNull(),
		},
		(t) => ({ pk: primaryKey({ columns: [t.ownerId, t.name] }) })
	);
}
