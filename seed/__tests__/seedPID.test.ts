import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { eq } from "drizzle-orm";

import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { createTestRig } from "~/app/testUtils/testRecords.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";
import { PIDNode } from "~/drizzle/schema/PIDNode.ts";
import { seedPID } from "~/seed/seedPID.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

describe("seedPID", () => {
	test("resolves equipment links by inventory filename key", async () => {
		const scope = await setupTestRequestScope();
		const rig = await createTestRig(scope);
		const equipment = await createTestRig(scope, { name: "Pressure sensor", kind: "equipment" });
		const directory = writeDiagram("pressure-sensor-file");

		const count = await seedPID(
			scope,
			directory,
			new Map([
				["test-rig", rig.id],
				["pressure-sensor-file", equipment.id],
			]),
		);

		const node = await scope
			.get(ApplicationDatabase)
			.select({ equipmentEntryId: PIDNode.equipmentEntryId })
			.from(PIDNode)
			.where(eq(PIDNode.inventoryEntryId, rig.id))
			.get();
		expect(count).toBe(1);
		expect(node?.equipmentEntryId).toBe(equipment.id);
	});

	test("rejects a rig file as an equipment link", async () => {
		const scope = await setupTestRequestScope();
		const rig = await createTestRig(scope);
		const directory = writeDiagram("test-rig");

		const result = seedPID(scope, directory, new Map([["test-rig", rig.id]]));

		await expect(result).rejects.toThrow('names no equipment inventory file "test-rig.json"');
	});
});

function writeDiagram(equipmentKey: string): string {
	const directory = mkdtempSync(join(tmpdir(), "adacta-seed-pid-"));
	temporaryDirectories.push(directory);
	writeFileSync(
		join(directory, "test-rig.json"),
		JSON.stringify({
			nodes: [
				{
					key: "sensor",
					kind: "instrument",
					label: "Sensor",
					equipment: equipmentKey,
					orientation: 0,
					position: { x: 0, y: 0 },
				},
			],
			edges: [],
		}),
	);
	return directory;
}
