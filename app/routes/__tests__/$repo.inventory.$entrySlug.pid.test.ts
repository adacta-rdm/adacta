import { describe, expect, test } from "bun:test";

import type { PIDGraph, PIDGraphNode } from "~/app/lib/PID.ts";
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
			secondaryLabel: null,
			parentId: null,
			orientation: 0,
			position: { x: 120, y: 160 },
		},
		{
			id: "inlet-valve",
			kind: "valve",
			label: "Inlet valve",
			secondaryLabel: null,
			parentId: null,
			orientation: 1,
			position: { x: 260, y: 160 },
		},
	],
	edges: [
		{
			id: "feed-line",
			kind: "pipe",
			weight: 1,
			material: "stainless steel 1.4571",
			innerDiameter: { value: 4, unit: "mm" },
			outerDiameter: { value: 6, unit: "mm" },
			length: { value: 1.5, unit: "m" },
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

		expect((await load(scope)).graph).toEqual({ nodes: [], edges: [] });
	});

	test("saves a graph and reloads it", async () => {
		const scope = await setupRig();

		const response = await save(scope, graph);

		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(303);
		expect((response as Response).headers.get("Location")).toBe("/demo/inventory/ammonia-rig/pid");
		expect((await load(scope)).graph).toEqual(graph);
	});

	test("replaces the complete graph", async () => {
		const scope = await setupRig();
		await save(scope, graph);

		await save(scope, { nodes: [graph.nodes[1]], edges: [] });

		expect((await load(scope)).graph).toEqual({ nodes: [graph.nodes[1]], edges: [] });
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

	test("keeps both labels of an instrument", async () => {
		const scope = await setupRig();
		const instrument: PIDGraphNode = {
			id: "feed-flow-controller",
			kind: "instrument",
			label: "MFC",
			secondaryLabel: "H2",
			parentId: null,
			orientation: 0,
			position: { x: 200, y: 160 },
		};

		await save(scope, { nodes: [...graph.nodes, instrument], edges: graph.edges });

		expect((await load(scope)).graph.nodes.at(-1)).toEqual(instrument);
	});

	test("keeps a symbol that sits inside another", async () => {
		const scope = await setupRig();
		const tap: PIDGraphNode = {
			id: "reactor-tap",
			kind: "junction",
			label: "Tap",
			secondaryLabel: null,
			parentId: graph.nodes[0].id,
			orientation: 0,
			position: { x: 10, y: 20 },
		};

		await save(scope, { nodes: [...graph.nodes, tap], edges: graph.edges });

		expect((await load(scope)).graph.nodes.at(-1)).toEqual(tap);
	});

	test("rejects a symbol that sits inside one outside the diagram", async () => {
		const scope = await setupRig();
		const orphan = { ...graph.nodes[0], id: "orphan", parentId: "missing-node" };

		const response = await save(scope, { nodes: [...graph.nodes, orphan], edges: [] });

		if (response instanceof Response) throw new Error("Expected action data.");
		expect(response.init?.status).toBe(400);
	});

	test("rejects a symbol that sits inside itself", async () => {
		const scope = await setupRig();
		const self = { ...graph.nodes[0], parentId: graph.nodes[0].id };

		const response = await save(scope, { nodes: [self], edges: [] });

		if (response instanceof Response) throw new Error("Expected action data.");
		expect(response.init?.status).toBe(400);
	});

	test("keeps the kind of each connection", async () => {
		const scope = await setupRig();
		const others = (["jacketed", "traced", "caption"] as const).map((kind) => ({
			...graph.edges[0],
			id: `${kind}-line`,
			kind,
		}));

		await save(scope, { nodes: graph.nodes, edges: [graph.edges[0], ...others] });

		expect((await load(scope)).graph.edges.map((edge) => edge.kind)).toEqual([
			"pipe",
			"jacketed",
			"traced",
			"caption",
		]);
	});

	test("keeps what a pipe is made of and how large it is", async () => {
		const scope = await setupRig();

		await save(scope, graph);

		expect((await load(scope)).graph.edges[0]).toMatchObject({
			material: "stainless steel 1.4571",
			innerDiameter: { value: 4, unit: "mm" },
			outerDiameter: { value: 6, unit: "mm" },
			length: { value: 1.5, unit: "m" },
		});
	});

	test("keeps a pipe whose size nobody has measured", async () => {
		const scope = await setupRig();
		const plain = {
			...graph.edges[0],
			material: null,
			innerDiameter: null,
			outerDiameter: null,
			length: null,
		};

		await save(scope, { nodes: graph.nodes, edges: [plain] });

		expect((await load(scope)).graph.edges[0]).toMatchObject({
			material: null,
			innerDiameter: null,
			outerDiameter: null,
			length: null,
		});
	});

	test("rejects a length given in an unknown unit", async () => {
		const scope = await setupRig();
		const invalidGraph = {
			nodes: graph.nodes,
			edges: [{ ...graph.edges[0], length: { value: 3, unit: "furlong" } }],
		};

		const response = await save(scope, invalidGraph);

		if (response instanceof Response) throw new Error("Expected action data.");
		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({ error: "The diagram contains invalid data." });
	});

	test("rejects a connection of an unknown kind", async () => {
		const scope = await setupRig();
		const invalidGraph = {
			nodes: graph.nodes,
			edges: [{ ...graph.edges[0], kind: "dotted" }],
		};

		const response = await save(scope, invalidGraph);

		if (response instanceof Response) throw new Error("Expected action data.");
		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({ error: "The diagram contains invalid data." });
	});

	test("rejects properties outside the graph format", async () => {
		const scope = await setupRig();
		const invalidGraph = {
			nodes: [{ ...graph.nodes[0], selected: true }],
			edges: [],
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

	await scope
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
