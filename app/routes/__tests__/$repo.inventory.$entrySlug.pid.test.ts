import { describe, expect, test } from "bun:test";

import type { PIDGraph } from "~/app/components/PIDEditor.tsx";
import { action, loader } from "~/app/routes/$repo.inventory.$entrySlug.pid.tsx";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils.ts";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

const graph: PIDGraph = {
	nodes: [
		{
			id: "feed-bottle",
			kind: "gas-bottle",
			label: "Feed gas",
			orientation: 0,
			position: { x: 120, y: 160 },
		},
		{
			id: "inlet-valve",
			kind: "valve",
			label: "Inlet valve",
			orientation: 1,
			position: { x: 260, y: 160 },
		},
	],
	edges: [
		{
			id: "feed-line",
			source: "feed-bottle",
			target: "inlet-valve",
			sourceHandle: "outlet",
			targetHandle: "inlet",
		},
	],
};

describe("P&ID route", () => {
	test("starts with an empty graph", async () => {
		const scope = await setupRig();

		expect(load(scope).graph).toEqual({ nodes: [], edges: [] });
	});

	test("saves a graph and reloads it", async () => {
		const scope = await setupRig();

		const response = await save(scope, graph);

		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(303);
		expect((response as Response).headers.get("Location")).toBe("/demo/inventory/ammonia-rig/pid");
		expect(load(scope).graph).toEqual(graph);
	});

	test("replaces the complete graph", async () => {
		const scope = await setupRig();
		await save(scope, graph);

		await save(scope, { nodes: [graph.nodes[1]], edges: [] });

		expect(load(scope).graph).toEqual({ nodes: [graph.nodes[1]], edges: [] });
	});

	test("rejects a connection to a node outside the graph", async () => {
		const scope = await setupRig();
		const invalidGraph = {
			nodes: [graph.nodes[0]],
			edges: [{ ...graph.edges[0], target: "missing-node" }],
		};

		const response = await save(scope, invalidGraph);

		if (response instanceof Response) throw new Error("Expected action data.");
		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({ error: "The diagram contains invalid data." });
	});
});

async function setupRig(): Promise<ServiceContainer> {
	const scope = await setupTestRepositoryEnvironment("demo");
	const userId = scope.get(Security).userId;

	scope
		.get(RepoDB)
		.insert(InventoryEntry)
		.values({
			slug: "ammonia-rig",
			name: "Ammonia rig",
			kind: "rig",
			metadataCreatorId: userId,
			metadataCreationTimestamp: new Date(),
		})
		.run();

	return scope;
}

function load(scope: ServiceContainer) {
	const [args] = createMiddlewareArgs(scope, {
		params: { repo: "demo", entrySlug: "ammonia-rig" },
	});

	return loader(args);
}

function save(scope: ServiceContainer, value: unknown) {
	const form = new FormData();
	form.set("graph", JSON.stringify(value));
	const request = new Request("http://localhost/demo/inventory/ammonia-rig/pid?edit", {
		method: "POST",
		body: form,
	});
	const [args] = createMiddlewareArgs(scope, {
		request,
		params: { repo: "demo", entrySlug: "ammonia-rig" },
	});

	return action(args);
}
