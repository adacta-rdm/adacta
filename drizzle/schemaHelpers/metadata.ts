import type { PgSchema } from "drizzle-orm/pg-core";
import { timestamp } from "drizzle-orm/pg-core";

import { User } from "~/drizzle/schema/global.User";
import { idType } from "~/drizzle/schemaHelpers/idType";
import type { IUserId } from "~/lib/database/Ids";

export function metadata(schemas: { global: PgSchema }) {
	return {
		metadataCreatorId: idType<IUserId>("metadata_creator_id")
			.notNull()
			.references(() => User(schemas).id),
		metadataCreationTimestamp: timestamp("metadata_creation_timestamp").notNull(),
		metadataDeletedAt: timestamp("metadata_deleted_at"),
	};
}
