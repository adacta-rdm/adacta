import assert from "assert";

import { assertDefined } from "@omegadot/assert";
import { isNotNull, sql } from "drizzle-orm";

import { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import { closureTableInsert } from "~/apps/repo-server/src/utils/closureTable/closureTableTree";
import type { DrizzleDb } from "~/drizzle/DrizzleDb";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";

export async function migrate(db: DrizzleDb, schema: DrizzleSchema) {
	await migrateDeviceDefinitionTree(db, schema);
	await migrateSpecifications(db, schema);
}

async function migrateDeviceDefinitionTree(db: DrizzleDb, schema: DrizzleSchema) {
	const { DeviceDefinition, DeviceDefinitionPaths } = schema;

	const definitions = await db.select().from(DeviceDefinition);
	await db.delete(DeviceDefinitionPaths);

	for (const definition of definitions) {
		assertDefined(definition.LEGACY_parentDeviceDefinitionIds);
		assert(
			definition.LEGACY_parentDeviceDefinitionIds.length === 1 ||
				definition.LEGACY_parentDeviceDefinitionIds.length === 0,
			"Only one parent allowed"
		);
		for (const parentDeviceDefinitionId of definition.LEGACY_parentDeviceDefinitionIds) {
			await closureTableInsert(
				new EntityLoader(db),
				DeviceDefinitionPaths,
				parentDeviceDefinitionId,
				definition.id
			);
		}
	}
}

async function migrateSpecifications(db: DrizzleDb, schema: DrizzleSchema) {
	const {
		Device,
		DeviceSpecification,
		DeviceDefinition,
		DeviceDefinitionSpecification,
		Sample,
		SampleSpecification,
	} = schema;

	function loadStuff<T extends typeof Device | typeof DeviceDefinition | typeof Sample>(t: T) {
		return db
			.select({
				ownerId: t.id,
				name: sql<string>`jsonb_array_elements(${t.LEGACY_specifications})::jsonb->'name'`,
				value: sql<string>`jsonb_array_elements(${t.LEGACY_specifications})::jsonb->'value'`,
			})
			.from(t)
			.where(isNotNull(t.LEGACY_specifications));
	}

	await db.delete(DeviceSpecification);
	await db.delete(DeviceDefinitionSpecification);
	await db.delete(SampleSpecification);

	const deviceSpecifications = await loadStuff(Device);
	if (deviceSpecifications.length) {
		await db.insert(DeviceSpecification).values(deviceSpecifications);
	}

	const deviceDefinitionSpecifications = await loadStuff(DeviceDefinition);
	if (deviceDefinitionSpecifications.length) {
		await db.insert(DeviceDefinitionSpecification).values(deviceDefinitionSpecifications);
	}

	const sampleSpecifications = await loadStuff(Sample);
	if (sampleSpecifications.length) {
		await db.insert(SampleSpecification).values(await loadStuff(Sample));
	}
}
