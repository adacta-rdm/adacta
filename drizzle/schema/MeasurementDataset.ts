import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { User } from "~/drizzle/schema/BetterAuth.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { OriginalFile } from "~/drizzle/schema/OriginalFile.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * One validated interpretation of an uploaded CSV and TOML sidecar.
 */
export const MeasurementDataset = sqliteTable(
	"MeasurementDataset",
	{
		id: integer("measurement_dataset_id")
			.notNull()
			.primaryKey()
			.references(() => Id.id),
		rigId: integer("rig_id")
			.notNull()
			.references(() => InventoryEntry.id),
		uploadId: integer("upload_id").notNull(),
		csvFileId: integer("csv_file_id")
			.notNull()
			.references(() => OriginalFile.id),
		sidecarFileId: integer("sidecar_file_id")
			.notNull()
			.references(() => OriginalFile.id),
		operatorId: text("operator_id")
			.notNull()
			.references(() => User.id),
		operatorEmail: text("operator_email").notNull(),
		rowCount: integer("row_count").notNull(),
		startTime: integer("start_time", { mode: "timestamp_ms" }),
		endTime: integer("end_time", { mode: "timestamp_ms" }),
		sidecarSnapshot: text("sidecar_snapshot").notNull(),
		analysisSnapshot: text("analysis_snapshot"),
		dataPath: text("data_path").notNull(),
		...metadata(),
	},
	(table) => [
		uniqueIndex("MeasurementDataset_source_pair_unique").on(table.csvFileId, table.sidecarFileId),
	],
);
