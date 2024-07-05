import { primaryKey } from "drizzle-orm/pg-core";

import { Project } from "~/drizzle/schema/repo.Project";
import { Sample } from "~/drizzle/schema/repo.Sample";
import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { idType } from "~/drizzle/schemaHelpers/idType";
import type { IProjectId, ISampleId } from "~/lib/database/Ids";

export function ProjectToSample(schemas: IPgSchemas) {
	return schemas.repo.table(
		"ProjectToSample",
		{
			projectId: idType<IProjectId>("project_id")
				.notNull()
				.references(() => Project(schemas).id),
			sampleId: idType<ISampleId>("sample_id")
				.notNull()
				.references(() => Sample(schemas).id),
		},
		(t) => ({
			pk: primaryKey({ columns: [t.projectId, t.sampleId] }),
		})
	);
}
