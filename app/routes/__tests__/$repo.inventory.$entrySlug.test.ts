import { describe, expect, test } from "bun:test";

import { loader } from "~/app/routes/$repo.inventory.$entrySlug.tsx";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils.ts";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry.ts";
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

		const response = await loader(argsFor(scope, "no-such-stand")).then(
			() => undefined,
			(thrown: unknown) => thrown,
		);

		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(404);
	});

	test("ignores an archived entry", async () => {
		const scope = await setupEntry();

		scope.get(RepoDB).update(InventoryEntry).set({ metadataArchivedAt: new Date() }).run();

		const response = await loader(argsFor(scope, "methanation-test-stand")).then(
			() => undefined,
			(thrown: unknown) => thrown,
		);

		expect((response as Response).status).toBe(404);
	});
});

function argsFor(scope: ServiceContainer, entrySlug: string) {
	const request = new Request(`http://localhost/demo/inventory/${entrySlug}`);
	const [args] = createMiddlewareArgs(scope, {
		request,
		params: { repo: "demo", entrySlug },
	});

	return args;
}

async function setupEntry(): Promise<ServiceContainer> {
	const scope = await setupTestRepositoryEnvironment("demo");

	scope
		.get(RepoDB)
		.insert(InventoryEntry)
		.values({
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
