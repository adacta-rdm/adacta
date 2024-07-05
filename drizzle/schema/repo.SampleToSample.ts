import { timestamp, varchar } from "drizzle-orm/pg-core";

import { Sample } from "~/drizzle/schema/repo.Sample";
import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { idType } from "~/drizzle/schemaHelpers/idType";
import type { ISampleId, ISampleRelationId } from "~/lib/database/Ids";

export function SampleToSample(schemas: IPgSchemas) {
	return schemas.repo.table("SampleToSample", {
		id: idType<ISampleRelationId>("sample_to_sample_id").primaryKey().notNull(),
		couchId: idType<string>("couch_id").unique(),
		sample1: idType<ISampleId>("sample1")
			.notNull()
			.references(() => Sample(schemas).id),
		sample2: idType<ISampleId>("sample2")
			.notNull()
			.references(() => Sample(schemas).id),
		begin: timestamp("begin"),
		relationType: varchar("relation_type", {
			length: 255,
			enum: ["createdOutOf"], // NOTE: This does not affect the SQL schema, only the TypeScript type
		}).notNull(),
	});
}
