import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { User } from "~/drizzle/schema/BetterAuth.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { OriginalFile } from "~/drizzle/schema/OriginalFile.ts";
import { Rig } from "~/drizzle/schema/Rig.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * A dataset records one validated interpretation of a CSV and its TOML sidecar.
 * The same pair can be imported once. A different interpretation requires a different sidecar file.
 */
export const Dataset = sqliteTable(
	"Dataset",
	{
		id: integer("dataset_id")
			.notNull()
			.primaryKey()
			.references(() => Id.id),
		rigId: integer("rig_id")
			.notNull()
			.references(() => Rig.id),
		/**
		 * Files from one upload share this identifier. There is no upload table.
		 */
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
		/**
		 * This preserves the operator email recorded by the sidecar at import.
		 */
		operatorEmail: text("operator_email").notNull(),
		rowCount: integer("row_count").notNull(),
		/**
		 * These bounds are null when the CSV uses a numeric axis.
		 */
		startTime: integer("start_time", { mode: "timestamp_ms" }),
		endTime: integer("end_time", { mode: "timestamp_ms" }),
		/**
		 * This JSON contains the validated sidecar fields. The original TOML remains in OriginalFile.
		 */
		sidecarSnapshot: text("sidecar_snapshot").notNull(),
		/**
		 * This JSON contains the chart overview and exact quality counts.
		 */
		analysisSnapshot: text("analysis_snapshot"),
		/**
		 * This path locates the converted Parquet file in storage.
		 */
		dataPath: text("data_path").notNull(),
		...metadata(),
	},
	(table) => [
		uniqueIndex("Dataset_source_pair_unique").on(table.csvFileId, table.sidecarFileId),
		index("Dataset_rig_archive_created_idx").on(
			table.rigId,
			table.metadataArchivedAt,
			table.metadataCreationTimestamp,
		),
		index("Dataset_upload_idx").on(table.uploadId),
	],
);
