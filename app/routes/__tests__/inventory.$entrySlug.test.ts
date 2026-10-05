import { describe, expect, test } from "bun:test";

import { loader } from "~/app/routes/inventory.$entrySlug.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { id53 } from "~/lib/id53/id53.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

describe("inventory entry loader", () => {
	test("returns the entry that carries the slug", async () => {
		const scope = await setupEntry();
		const result = await loader(argsFor(scope, "methanation-test-stand"));

		expect(result.entry.name).toBe("Methanation Test Stand");
		expect(result.entry.kind).toBe("rig");
		expect(result.entry.location).toEqual({
			building: "B7",
			room: "12",
			label: null,
		});
	});

	test("responds with 404 when no entry carries the slug", async () => {
		const scope = await setupEntry();

		const result = await loader(argsFor(scope, "no-such-stand")).then(
			() => undefined,
			(thrown: unknown) => thrown,
		);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(404);
	});

	test("ignores an archived entry", async () => {
		const scope = await setupEntry();

		await scope
			.get(ApplicationDatabase)
			.update(InventoryEntry)
			.set({ metadataArchivedAt: new Date() })
			.run();

		const result = await loader(argsFor(scope, "methanation-test-stand")).then(
			() => undefined,
			(thrown: unknown) => thrown,
		);

		expect((result as Response).status).toBe(404);
	});
});

function argsFor(scope: ServiceContainer, entrySlug: string) {
	const request = new Request(`http://localhost/inventory/${entrySlug}`);
	const [args] = createMiddlewareArgs(scope, {
		request,
		params: { entrySlug },
	});

	return args;
}

async function setupEntry(): Promise<ServiceContainer> {
	const scope = await setupTestRequestScope();
	const id = id53();
	await scope.get(ApplicationDatabase).insert(Id).values({ id }).run();

	await scope
		.get(ApplicationDatabase)
		.insert(InventoryEntry)
		.values({
			id,
			slug: "methanation-test-stand",
			name: "Methanation Test Stand",
			kind: "rig",
			locationBuildingIdentifier: "B7",
			locationRoomIdentifier: "12",
			metadataCreatorId: scope.get(Security).userId,
			metadataCreationTimestamp: new Date(),
		})
		.run();

	return scope;
}
