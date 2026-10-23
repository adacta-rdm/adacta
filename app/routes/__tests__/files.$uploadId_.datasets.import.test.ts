import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import {
	SIDECAR_READ_LIMIT,
	stringifyDatasetSidecar,
	type SidecarItem,
} from "~/app/lib/datasetSidecar.ts";
import * as uploadRoute from "~/app/routes/files.$uploadId.tsx";
import { action, loader } from "~/app/routes/files.$uploadId_.datasets.import.tsx";
import * as reviewRoute from "~/app/routes/files.$uploadId_.datasets.import.tsx";
import { loader as datasetLoader } from "~/app/routes/files.datasets.$datasetId.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { UploadManager } from "~/app/services/UploadManager.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import {
	createTestEquipment,
	createTestManufacturer,
	createTestProduct,
	createTestRig,
	createTestUpload,
} from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";
import { Channel } from "~/drizzle/schema/Channel.ts";
import { Dataset } from "~/drizzle/schema/Dataset.ts";
import { Equipment } from "~/drizzle/schema/Equipment.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { PIDNode } from "~/drizzle/schema/PIDNode.ts";
import { Product } from "~/drizzle/schema/Product.ts";

describe("files.$uploadId_.datasets.import", () => {
	describe("loader", () => {
		test("previews the CSV and original TOML when the sidecar is invalid", async () => {
			const scope = await setupTestRequestScope();
			const { uploadId } = await numericUpload(scope, false, "Position,Signal\n0,1\n", {
				transformSidecar: () => "[experiment\n",
			});
			const route = testRoute(scope, reviewRoute, { uploadId: String(uploadId) });

			const result = await route.loader();

			expect(result.data?.preview).toBeNull();
			expect(result.data?.csvRawPreview.rows).toEqual([
				["Position", "Signal"],
				["0", "1"],
			]);
			expect(result.data?.sidecarTextPreview.text).toBe("[experiment\n");
			expect(result.data?.sidecarIssues.length).toBeGreaterThan(0);
		});

		test("rejects an upload without one CSV and one TOML sidecar", async () => {
			const scope = await setupTestRequestScope();
			const { uploadId } = await createTestUpload(scope);
			const route = testRoute(scope, reviewRoute, { uploadId: String(uploadId) });

			const result = await route.loader();

			expect(result.status).toBe(404);
		});

		test("shows CSV columns against the selected rig's P&ID", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope, { slug: "preview-rig", name: "Preview Rig" });
			await scope
				.get(ApplicationDatabase)
				.insert(PIDNode)
				.values({
					id: "flow-node",
					rigId: rig.id,
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
			const sidecar = stringifyDatasetSidecar({
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
					`http://localhost/files/${uploadId}/datasets/import?contextKind=inventory-entry&contextSlug=preview-rig&contextLabel=Preview+Rig`,
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
			expect(result.csvRawPreview.rows[0]).toEqual(["Time", "Flow"]);
			expect(result.sidecarTextPreview.text).toContain("operator_email");
			expect(result.rigPreview).toMatchObject({
				id: rig.id,
				name: "Preview Rig",
				symbolKeys: ["FIRC_101"],
				graph: { nodes: [{ id: "flow-node", symbolKey: "FIRC_101" }], edges: [] },
			});
		});
	});

	describe("action", () => {
		test("refuses a serial number that identifies several units on the selected rig", async () => {
			const scope = await setupTestRequestScope();
			const { uploadId, rigId } = await numericUpload(scope, false, "Position,Signal\n0,1\n", {
				equipmentSerialNumber: "SN-001",
				sidecarItem: { serial_number: "SN-001" },
			});
			const maker = await createTestManufacturer(scope, { name: "Other manufacturer" });
			const product = await createTestProduct(scope, maker, { name: "Second model" });
			const equipment = await createTestEquipment(
				scope,
				{ slug: "second-device", serialNumber: "SN-001" },
				product,
			);
			await scope
				.get(ApplicationDatabase)
				.insert(PIDNode)
				.values({
					id: "second-device-node",
					rigId,
					equipmentId: equipment.id,
					symbolKey: "SECOND",
					kind: "instrument",
					label: "Second device",
					drawingOrder: 1,
					orientation: 0,
					positionX: 0,
					positionY: 0,
					metadataCreatorId: scope.get(Security).userId,
					metadataCreationTimestamp: new Date(),
				})
				.run();
			const route = testRoute(scope, reviewRoute, { uploadId: String(uploadId) });

			const result = await route.action({ rigId: String(rigId) });

			expect(result.status).toBe(422);
			expect(result.data?.error).toContain('serial number "SN-001"');
			expect(result.data?.error).toContain("Scan device (scan-device)");
			expect(result.data?.error).toContain("Second model (second-device)");
			const upload = await testRoute(scope, uploadRoute, { uploadId: String(uploadId) }).loader();
			expect(upload.data?.datasetImports).toHaveLength(0);
		});

		test("resolves a sidecar slug to equipment when a rig has the same slug", async () => {
			const scope = await setupTestRequestScope();
			const { uploadId, rigId } = await numericUpload(scope, false, "Position,Signal\n0,1\n", {
				sidecarItem: { slug: "scan-device" },
			});
			await createTestRig(scope, { slug: "scan-device" });
			const route = testRoute(scope, reviewRoute, { uploadId: String(uploadId) });

			const result = await route.action({ rigId: String(rigId) });

			expect(result.status).toBe(303);
			const datasetId = result.location!.split("/").at(-1)!;
			const dataset = await datasetLoader(
				createMiddlewareArgs(scope, { params: { datasetId } })[0],
			);
			expect(dataset.columns[1]).toMatchObject({
				inventoryName: "Scan device",
				channelKey: "signal",
			});
		});

		test("rejects an oversized sidecar whose prefix is valid TOML", async () => {
			const scope = await setupTestRequestScope();
			const { uploadId, rigId } = await numericUpload(scope, false, "Position,Signal\n0,1\n", {
				transformSidecar: (source) =>
					source.padEnd(SIDECAR_READ_LIMIT, " ") + "\n[ignored]\nvalue = 1\n",
			});
			const route = testRoute(scope, reviewRoute, { uploadId: String(uploadId) });
			const preview = await route.loader();
			expect(preview.data?.sidecarIssues).toEqual([
				{ path: "toml", message: "The sidecar exceeds the 256 KB limit." },
			]);
			expect(preview.data?.csvRawPreview.rows).toEqual([
				["Position", "Signal"],
				["0", "1"],
			]);
			expect(preview.data?.sidecarTextPreview.truncated).toBe(true);
			const result = await route.action({ rigId: String(rigId) });
			expect(result.status).toBe(422);
			expect(result.data?.error).toBe("The sidecar exceeds the 256 KB limit.");
			expect(await scope.get(ApplicationDatabase).select().from(Dataset).all()).toEqual([]);
			expect(await scope.get(UploadManager).filesOfUpload(uploadId)).toHaveLength(2);
		});

		test.each([false, true])(
			"imports a numeric x axis without time (linked: %s)",
			async (linked) => {
				const scope = await setupTestRequestScope();
				const { uploadId, rigId, equipmentId } = await numericUpload(
					scope,
					linked,
					"Position,Signal\n0,1\n0.5,2\n1,3\n",
				);
				const form = new FormData();
				form.set("rigId", String(rigId));
				const [args] = createMiddlewareArgs(scope, {
					request: new Request(`http://localhost/files/${uploadId}/datasets/import`, {
						method: "POST",
						body: form,
					}),
					params: { uploadId: String(uploadId) },
				});

				const response = await action(args);

				expect(response).toBeInstanceOf(Response);
				const datasetId = Number((response as Response).headers.get("Location")?.split("/").at(-1));
				expect((response as Response).headers.get("Location")).toBe(`/files/datasets/${datasetId}`);
				const [detailArgs] = createMiddlewareArgs(scope, {
					request: new Request(`http://localhost/files/datasets/${datasetId}`),
					params: { datasetId: String(datasetId) },
				});
				const detail = await datasetLoader(detailArgs);
				expect(detail.dataset.startTime).toBeNull();
				expect(detail.timeZone).toBeNull();
				expect(detail.columns[0]).toMatchObject({
					axis: "numeric",
					parquetType: "DOUBLE",
					unit: "mm",
					equipmentId: linked ? equipmentId : null,
				});
				expect(detail.analysis?.overview).toEqual([
					{ x: 0, values: [0, 1] },
					{ x: 0.5, values: [0.5, 2] },
					{ x: 1, values: [1, 3] },
				]);
				expect(detail.rows).toEqual([
					["0", "1"],
					["0.5", "2"],
					["1", "3"],
				]);
			},
		);

		test("resolves a sidecar item by serial number", async () => {
			const scope = await setupTestRequestScope();
			const { uploadId, rigId, equipmentId } = await numericUpload(
				scope,
				false,
				"Position,Signal\n0,1\n",
				{ equipmentSerialNumber: "SN-001", sidecarItem: { serial_number: "SN-001" } },
			);
			const route = testRoute(scope, reviewRoute, { uploadId: String(uploadId) });

			const result = await route.action({ rigId: String(rigId) });

			expect(result.status).toBe(303);
			const datasetId = result.location?.split("/").at(-1);
			expect(datasetId).toBeDefined();
			const detail = testRoute(scope, { loader: datasetLoader }, { datasetId: datasetId! });
			const imported = (await detail.loader()).data;
			expect(imported?.columns[1]).toMatchObject({
				equipmentId: equipmentId,
				channelKey: "signal",
			});
		});

		test("opens the existing dataset when the same files are imported again", async () => {
			const scope = await setupTestRequestScope();
			const { uploadId, rigId } = await numericUpload(scope, false, "Position,Signal\n0,1\n");
			const route = testRoute(scope, reviewRoute, { uploadId: String(uploadId) });
			const first = await route.action({ rigId: String(rigId) });

			const result = await route.action(
				{ rigId: String(rigId) },
				{
					query: {
						contextKind: "inventory-entry",
						contextSlug: "test-rig",
						contextLabel: "Test rig",
					},
				},
			);

			expect(result.status).toBe(303);
			expect(result.location).toBe(first.location);
			expect(result.location).toMatch(/^\/files\/datasets\/\d+$/);
		});

		test.each(["", "NaN", "outside"])('rejects an invalid numeric x value "%s"', async (value) => {
			const scope = await setupTestRequestScope();
			const { uploadId, rigId } = await numericUpload(
				scope,
				false,
				`Position,Signal\n${value},1\n`,
			);
			const form = new FormData();
			form.set("rigId", String(rigId));
			const [args] = createMiddlewareArgs(scope, {
				request: new Request(`http://localhost/files/${uploadId}/datasets/import`, {
					method: "POST",
					body: form,
				}),
				params: { uploadId: String(uploadId) },
			});

			const response = await action(args);

			expect(response).toMatchObject({ init: { status: 422 } });
			expect((response as { data: { error: string } }).data.error).toBe(
				"Row 2, column 1: invalid numeric axis value.",
			);
		});

		test("requires a selected rig before importing", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, reviewRoute, { uploadId: "1234567890123" });

			const result = await route.action({ rigId: "" });

			expect(result.status).toBe(422);
			expect(result.data?.error).toBe("Select a rig for this import.");
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
			const equipment = await createTestEquipment(scope, {
				slug: "flow-meter",
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
					rigId: rig.id,
					equipmentId: equipment.id,
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
			const sidecar = stringifyDatasetSidecar({
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
				request: new Request(`http://localhost/files/${uploadId}/datasets/import`, {
					method: "POST",
					body: form,
				}),
				params: { uploadId: String(uploadId) },
			});

			const response = await action(args);
			if (!(response instanceof Response)) throw new Error("Expected an import redirect.");
			expect(response.status).toBe(303);
			const dataset = await db.select().from(Dataset).where(eq(Dataset.uploadId, uploadId)).get();
			expect(dataset).toBeDefined();
			const [detailArgs] = createMiddlewareArgs(scope, {
				request: new Request(`http://localhost/files/datasets/${dataset!.id}`),
				params: { datasetId: String(dataset!.id) },
			});
			const detail = await datasetLoader(detailArgs);
			expect(detail.analysis).toMatchObject({
				columns: [{ count: 0 }, { count: 2, missing: 1, minimum: 1.5, maximum: 2.5 }],
				nonIncreasingTimeSteps: 1,
				largestTimeStepMs: 1000,
			});
			expect(detail.analysis?.overview).toHaveLength(3);
		});

		test("requires restoration before importing for an archived rig", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope, { metadataArchivedAt: new Date() });
			const route = testRoute(scope, reviewRoute, { uploadId: "1234567890123" });

			const result = await route.action({ rigId: String(rig.id) });

			expect(result.status).toBe(422);
			expect(result.data?.error).toBe("Restore this rig before importing measurements.");
		});

		test("requires restoration before importing references to archived equipment", async () => {
			const scope = await setupTestRequestScope();
			const { uploadId, rigId, equipmentId } = await numericUpload(
				scope,
				true,
				"Position,Signal\n0,1\n",
			);
			await scope
				.get(ApplicationDatabase)
				.update(Equipment)
				.set({ metadataArchivedAt: new Date() })
				.where(eq(Equipment.id, equipmentId))
				.run();
			const route = testRoute(scope, reviewRoute, { uploadId: String(uploadId) });

			const result = await route.action({ rigId: String(rigId) });

			expect(result.status).toBe(422);
			expect(result.data?.error).toContain("Restore archived records before importing.");
		});
	});
});

async function numericUpload(
	scope: Awaited<ReturnType<typeof setupTestRequestScope>>,
	linked: boolean,
	csv: string,
	options: {
		equipmentSerialNumber?: string;
		sidecarItem?: SidecarItem;
		transformSidecar?: (source: string) => string;
	} = {},
) {
	const db = scope.get(ApplicationDatabase);
	const userId = scope.get(Security).userId;
	const metadata = { metadataCreatorId: userId, metadataCreationTimestamp: new Date() };
	const rig = await createTestRig(scope, { slug: "scan-rig" });
	const manufacturer = await db
		.insert(Manufacturer)
		.values({ slug: "scan-maker", name: "Scan maker", ...metadata })
		.returning({ id: Manufacturer.id })
		.get();
	const product = await db
		.insert(Product)
		.values({
			manufacturerId: manufacturer.id,
			slug: "scan-device",
			name: "Scan device",
			productNumber: "SD-1",
			subtitle: "Scan device",
			...metadata,
		})
		.returning({ id: Product.id })
		.get();
	const equipment = await createTestEquipment(scope, {
		slug: "scan-device",
		productId: product.id,
		serialNumber: options.equipmentSerialNumber,
	});
	const sidecarItem = options.sidecarItem ?? { id: equipment.id };
	await db
		.insert(Channel)
		.values([
			{ productId: product.id, position: 0, key: "position", role: "measurement", ...metadata },
			{ productId: product.id, position: 1, key: "signal", role: "measurement", ...metadata },
		])
		.run();
	await db
		.insert(PIDNode)
		.values({
			id: "scan-node",
			rigId: rig.id,
			equipmentId: equipment.id,
			kind: "instrument",
			label: "Scan",
			symbolKey: "SCAN",
			drawingOrder: 0,
			orientation: 0,
			positionX: 20,
			positionY: 30,
			...metadata,
		})
		.run();
	const sidecar = stringifyDatasetSidecar({
		file_structure: {
			column_delimiter: ",",
			decimal_separator: ".",
			header_rows: 1,
			data_row: 2,
			file_encoding: "UTF-8",
		},
		experiment: { operator_email: "test.user@example.com", samples: [] },
		columns: [
			linked
				? {
						name: "Position",
						axis: "numeric",
						unit: "mm",
						symbol_key: "SCAN",
						item: sidecarItem,
						channel: "position",
						role: "measurement",
					}
				: { name: "Position", axis: "numeric", unit: "mm" },
			{
				name: "Signal",
				symbol_key: "SCAN",
				item: sidecarItem,
				channel: "signal",
				role: "measurement",
				unit: "1",
			},
		],
	});
	const upload = scope.get(UploadManager).beginUpload();
	await upload.add({
		originalName: "scan.csv",
		mediaType: "text/csv",
		source: new Blob([csv]).stream(),
	});
	await upload.add({
		originalName: "scan.toml",
		mediaType: "application/toml",
		source: new Blob([options.transformSidecar?.(sidecar) ?? sidecar]).stream(),
	});
	return { uploadId: await upload.commit(userId), rigId: rig.id, equipmentId: equipment.id };
}
