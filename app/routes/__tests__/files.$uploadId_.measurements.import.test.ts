import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import { stringifyMeasurementSidecar } from "~/app/lib/measurementSidecar.ts";
import { action, loader } from "~/app/routes/files.$uploadId_.measurements.import.tsx";
import * as reviewRoute from "~/app/routes/files.$uploadId_.measurements.import.tsx";
import { loader as measurementLoader } from "~/app/routes/files.measurements.$datasetId.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { UploadManager } from "~/app/services/UploadManager.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { createTestRig, createTestUpload } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";
import { Channel } from "~/drizzle/schema/Channel.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { MeasurementDataset } from "~/drizzle/schema/MeasurementDataset.ts";
import { PIDNode } from "~/drizzle/schema/PIDNode.ts";
import { Product } from "~/drizzle/schema/Product.ts";

describe("measurement import review", () => {
	test("rejects an upload without one CSV and one TOML sidecar", async () => {
		const scope = await setupTestRequestScope();
		const { uploadId } = await createTestUpload(scope);
		const route = testRoute(scope, reviewRoute, { uploadId: String(uploadId) });

		const result = await route.loader();

		expect(result.status).toBe(404);
	});

	test("requires a selected rig before importing", async () => {
		const scope = await setupTestRequestScope();
		const route = testRoute(scope, reviewRoute, { uploadId: "1234567890123" });

		const result = await route.action({ rigId: "" });

		expect(result.status).toBe(422);
		expect(result.data?.error).toBe("Select a rig for this import.");
	});

	test("shows CSV columns against the selected rig's P&ID", async () => {
		const scope = await setupTestRequestScope();
		const rig = await createTestRig(scope, { slug: "preview-rig", name: "Preview Rig" });
		await scope
			.get(ApplicationDatabase)
			.insert(PIDNode)
			.values({
				id: "flow-node",
				inventoryEntryId: rig.id,
				kind: "instrument",
				label: "Flow",
				symbolKey: "FIRC_101",
				drawingOrder: 0,
				inletCount: 1,
				orientation: 0,
				positionX: 20,
				positionY: 30,
				metadataCreatorId: scope.get(Security).userId,
				metadataCreationTimestamp: new Date(),
			})
			.run();
		const sidecar = stringifyMeasurementSidecar({
			file_structure: {
				column_delimiter: "comma",
				decimal_separator: ".",
				header_rows: 1,
				data_row: 2,
				file_encoding: "UTF-8",
			},
			experiment: { operator_email: "operator@example.test", samples: [] },
			columns: [
				{ name: "Time", axis: "time", format: "%Y-%m-%dT%H:%M:%SZ", timezone: "UTC" },
				{
					name: "Flow",
					symbol_key: "FIRC_101",
					item: { slug: "flow-meter" },
					channel: "flow",
					role: "measurement",
					unit: "ml/min",
				},
			],
		});
		const upload = scope.get(UploadManager).beginUpload();
		await upload.add({
			originalName: "measurement.csv",
			mediaType: "text/csv",
			source: new Blob(["Time,Flow\n2026-08-20T09:00:00Z,1.5\n"]).stream(),
		});
		await upload.add({
			originalName: "measurement.toml",
			mediaType: "application/toml",
			source: new Blob([sidecar]).stream(),
		});
		const uploadId = await upload.commit(scope.get(Security).userId);
		const [args] = createMiddlewareArgs(scope, {
			request: new Request(
				`http://localhost/files/${uploadId}/measurements/import?contextKind=inventory-entry&contextSlug=preview-rig&contextLabel=Preview+Rig`,
			),
			params: { uploadId: String(uploadId) },
		});

		const result = await loader(args);

		expect(result.selectedRigId).toBe(rig.id);
		expect(result.sidecar?.columns).toMatchObject([
			{ name: "Time" },
			{ name: "Flow", symbol_key: "FIRC_101" },
		]);
		expect(result.preview).toMatchObject({
			columns: ["Time", "Flow"],
			rows: [["2026-08-20T09:00:00Z", "1.5"]],
			issues: [],
		});
		expect(result.rigPreview).toMatchObject({
			id: rig.id,
			name: "Preview Rig",
			symbolKeys: ["FIRC_101"],
			graph: { nodes: [{ id: "flow-node", symbolKey: "FIRC_101" }], edges: [] },
		});
	});

	test("stores a full-record overview and quality summary", async () => {
		const scope = await setupTestRequestScope();
		const db = scope.get(ApplicationDatabase);
		const userId = scope.get(Security).userId;
		const metadata = { metadataCreatorId: userId, metadataCreationTimestamp: new Date() };
		const rig = await createTestRig(scope, { slug: "measurement-rig" });
		const manufacturer = await db
			.insert(Manufacturer)
			.values({ slug: "test-maker", name: "Test maker", ...metadata })
			.returning({ id: Manufacturer.id })
			.get();
		const product = await db
			.insert(Product)
			.values({
				manufacturerId: manufacturer.id,
				slug: "flow-meter",
				name: "Flow meter",
				productNumber: "FM-1",
				subtitle: "Flow meter",
				...metadata,
			})
			.returning({ id: Product.id })
			.get();
		const equipment = await createTestRig(scope, {
			kind: "equipment",
			slug: "flow-meter",
			name: "Flow meter",
			productId: product.id,
		});
		await db
			.insert(Channel)
			.values({
				productId: product.id,
				position: 0,
				key: "flow",
				role: "measurement",
				...metadata,
			})
			.run();
		await db
			.insert(PIDNode)
			.values({
				id: "flow-node",
				inventoryEntryId: rig.id,
				equipmentEntryId: equipment.id,
				kind: "instrument",
				label: "Flow",
				symbolKey: "FIRC_101",
				drawingOrder: 0,
				orientation: 0,
				positionX: 20,
				positionY: 30,
				...metadata,
			})
			.run();
		const sidecar = stringifyMeasurementSidecar({
			file_structure: {
				column_delimiter: "comma",
				decimal_separator: ".",
				header_rows: 1,
				data_row: 2,
				file_encoding: "UTF-8",
			},
			experiment: { operator_email: "test.user@example.com", samples: [] },
			columns: [
				{ name: "Time", axis: "time", format: "%Y-%m-%dT%H:%M:%SZ", timezone: "UTC" },
				{
					name: "Flow",
					symbol_key: "FIRC_101",
					item: { id: equipment.id },
					channel: "flow",
					role: "measurement",
					unit: "ml/min",
				},
			],
		});
		const upload = scope.get(UploadManager).beginUpload();
		await upload.add({
			originalName: "measurement.csv",
			mediaType: "text/csv",
			source: new Blob([
				"Time,Flow\n2026-08-20T09:00:00Z,1.5\n2026-08-20T09:00:01Z,\n2026-08-20T09:00:00Z,2.5\n",
			]).stream(),
		});
		await upload.add({
			originalName: "measurement.toml",
			mediaType: "application/toml",
			source: new Blob([sidecar]).stream(),
		});
		const uploadId = await upload.commit(userId);
		const form = new FormData();
		form.set("rigId", String(rig.id));
		const [args] = createMiddlewareArgs(scope, {
			request: new Request(`http://localhost/files/${uploadId}/measurements/import`, {
				method: "POST",
				body: form,
			}),
			params: { uploadId: String(uploadId) },
		});

		const response = await action(args);
		if (!(response instanceof Response)) throw new Error("Expected an import redirect.");
		expect(response.status).toBe(303);
		const dataset = await db
			.select()
			.from(MeasurementDataset)
			.where(eq(MeasurementDataset.uploadId, uploadId))
			.get();
		expect(dataset).toBeDefined();
		const [detailArgs] = createMiddlewareArgs(scope, {
			request: new Request(`http://localhost/files/measurements/${dataset!.id}`),
			params: { datasetId: String(dataset!.id) },
		});
		const detail = await measurementLoader(detailArgs);
		expect(detail.analysis).toMatchObject({
			columns: [{ count: 0 }, { count: 2, missing: 1, minimum: 1.5, maximum: 2.5 }],
			nonIncreasingTimeSteps: 1,
			largestTimeStepMs: 1000,
		});
		expect(detail.analysis?.overview).toHaveLength(3);
	});
});
