import { primaryKey } from "drizzle-orm/pg-core";

import { Device } from "~/drizzle/schema/repo.Device";
import { Project } from "~/drizzle/schema/repo.Project";
import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { idType } from "~/drizzle/schemaHelpers/idType";
import type { IDeviceId, IProjectId } from "~/lib/database/Ids";

export function ProjectToDevice(schemas: IPgSchemas) {
	return schemas.repo.table(
		"ProjectToDevice",
		{
			projectId: idType<IProjectId>("project_id")
				.notNull()
				.references(() => Project(schemas).id),
			deviceId: idType<IDeviceId>("device_id")
				.notNull()
				.references(() => Device(schemas).id),
		},
		(t) => ({
			pk: primaryKey({ columns: [t.projectId, t.deviceId] }),
		})
	);
}
