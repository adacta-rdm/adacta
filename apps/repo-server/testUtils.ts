import { PGlite } from "@electric-sql/pglite";
import { assertDefined } from "@omegadot/assert";
import { PgDialect } from "drizzle-orm/pg-core";
import { drizzle as pgliteDrizzle } from "drizzle-orm/pglite/driver";
import type { SQL } from "drizzle-orm/sql/sql";

import { AuthenticatedUserInfo } from "~/apps/repo-server/src/graphql/AuthenticatedUserInfo";
import { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import { RepositoryManagerPostgres } from "~/apps/repo-server/src/services/RepositoryManagerPostgres";
import { isEntityId } from "~/apps/repo-server/src/utils/isEntityId";
import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import { entityByTypeId } from "~/drizzle/DrizzleSchema";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type { IDeviceId, ISampleId, IUserId } from "~/lib/database/Ids";
import { SilentLogger } from "~/lib/logger/SilentLogger";
import { ServiceContainer } from "~/lib/serviceContainer/ServiceContainer";
import { uuid } from "~/lib/uuid";

/**
 * Wraps a simple integer into a date
 * @param day
 */
export function integerToDate(day: number) {
	return new Date(2020, 0, day);
}

/**
 * Unwraps the date back into an integer (reverse action of `integerToDate`)
 * @param a
 */
export function dateToInteger(a: Date | undefined | null) {
	if (!a) {
		return "now";
	}
	return (a.getTime() - integerToDate(1).getTime()) / 60 / 60 / 24 / 1000 + 1;
}

export class TestDeviceCreator {
	device?: DrizzleEntity<"Device">;
	userId: IUserId;
	properties: DrizzleEntity<"Property">[] = [];

	constructor(user: IUserId) {
		this.userId = user;
	}

	public addDevice(definition: DrizzleEntity<"DeviceDefinition">, deviceName: string) {
		this.device = EntityFactory.create(
			"Device",
			{
				couchId: null,
				shortId: null,
				name: deviceName,
				definitionId: definition.id,
				specifications: [],
				imageResourceIds: [],
				setupDescription: [],
			},
			this.userId
		);
		// Reset collected properties which were for a different device
		this.properties = [];
	}

	public addProperty(
		name: string,
		value: IDeviceId | ISampleId,
		begin: Date,
		end: Date | null = null
	) {
		assertDefined(this.device, "addDevice() needs to be called before calling addProperty()");

		this.properties.push(
			EntityFactory.create(
				"Property",
				{
					name,
					begin,
					end,
					ownerDeviceId: this.device.id,
					deviceId: isEntityId(value, "Device") ? value : null,
					sampleId: isEntityId(value, "Sample") ? value : null,
				},
				this.userId
			)
		);
	}

	public getEntities(): [DrizzleEntity<"Device">, ...DrizzleEntity<"Property">[]] {
		assertDefined(this.device, "TestDeviceCreator: Device not defined");
		return [this.device, ...this.properties];
	}
}

export const createTestDb = async () => {
	const sc = new ServiceContainer();

	const drizzle = pgliteDrizzle(new PGlite());
	const rmp = sc.set(new RepositoryManagerPostgres({} as any));
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	rmp.db = () => drizzle as any;
	const el = sc.set(new EntityLoader(drizzle as any));
	await rmp.migrate();
	await rmp.createRepository("test");
	const schema = sc.set(rmp.schema("test"));

	const counter = new Map<string, number>();

	// Override EntityFactory.id to generate deterministic ids
	EntityFactory.id = (e) => {
		const entry = Object.entries(entityByTypeId).find(([, v]) => v === e);
		if (!entry) throw new Error(`No entity with typeid ${e}`);
		const hex = Number(entry[0]).toString(16).padStart(2, "0");

		const count = counter.get(hex) ?? 0;
		counter.set(hex, count + 1);

		const id = `${count}`.padStart(12, "0");
		return `00000000-0000-00${hex}-0000-${id}` as DrizzleEntity<typeof e>["id"];
		// 00000000-0000-x000-y000-000000000000
		//               14   19
	};

	const user = EntityFactory.create("User", {
		mikroORMId: uuid(),
		firstName: "Test",
		lastName: "User",
		email: "test.user@example.com",
		passwordHash: "password",
		salt: "salt",
		locale: "en",
		dateStyle: "short",
		timeStyle: "short",
	});
	await drizzle.insert(schema.User).values(user);

	sc.set(new AuthenticatedUserInfo(user.id, "token"));
	sc.set(new SilentLogger());

	return { drizzle, el, schema, user, sc };
};

// Test UUID use a custom format, where the last part is a simple counter
export function testUUIDtoInteger(id: string) {
	const n = id.lastIndexOf("-");
	return `${Number(id.substring(n + 1))}`;
}

export function debugRawQuery(query: SQL<unknown>) {
	const pgDialect = new PgDialect();
	// eslint-disable-next-line no-console
	console.log(pgDialect.sqlToQuery(query.inlineParams()).sql);
}
