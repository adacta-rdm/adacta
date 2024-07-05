import { primaryKey } from "drizzle-orm/pg-core";

import { Project } from "~/drizzle/schema/repo.Project";
import { Resource } from "~/drizzle/schema/repo.Resource";
import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { idType } from "~/drizzle/schemaHelpers/idType";
import type { IProjectId, IResourceId } from "~/lib/database/Ids";

export function ProjectToResource(schemas: IPgSchemas) {
	return schemas.repo.table(
		"ProjectToResource",
		{
			projectId: idType<IProjectId>("project_id")
				.notNull()
				.references(() => Project(schemas).id),
			resourceId: idType<IResourceId>("resource_id")
				.notNull()
				.references(() => Resource(schemas).id),
		},
		(t) => ({
			pk: primaryKey({ columns: [t.projectId, t.resourceId] }),
		})
	);
}
