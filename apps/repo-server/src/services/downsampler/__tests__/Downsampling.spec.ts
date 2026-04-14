import assert from "assert";

import type { MockInstance } from "vitest";
import { describe, expect, test, vi } from "vitest";

import { TaskDispatcher } from "../../TaskDispatcher/TaskDispatcher";
import { Downsampling } from "../Downsampling";

import { RemoteServicesConfig } from "~/apps/repo-server/src/config/RemoteServicesConfig";
import { RepositoryInfo } from "~/apps/repo-server/src/graphql/RepositoryInfo";
import { ResourceAttachmentManager } from "~/apps/repo-server/src/graphql/context/ResourceAttachmentManager";
import { SubscriptionPublisher } from "~/apps/repo-server/src/graphql/context/SubscriptionPublisher";
import { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import { createTestDb } from "~/apps/repo-server/testUtils";
import { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { assertDefined } from "~/lib/assert";
import { createIDatetime } from "~/lib/createDate";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type { IDeviceId } from "~/lib/database/Ids";
import { mkdirTmp } from "~/lib/fs";
import type { ITabularDataColumnDescription } from "~/lib/interface/ITabularDataColumnDescription";
import { FileSystemStorageEngine } from "~/lib/storage-engine";
import type { StorageEngine } from "~/lib/storage-engine";
import type { Writable } from "~/lib/streams";
import { TabularData } from "~/lib/tabular-data";

/**
 * Creates a column description with the given independent index.
 * If the independent index is -1, the column is independent.
 * @param independentIndex
 */
const createColumnDescription = (independentIndex: number): ITabularDataColumnDescription => ({
	type: "number",
	deviceId: "123" as IDeviceId,
	description: "",
	unit: "",
	title: "",
	columnId: "",
	independentVariables: independentIndex < 0 ? [] : [independentIndex],
});

const createTable = async ({
	ef,
	sto,
	containsIndependent = true,
	fillTable: fillTableOption = true,
}: {
	ef: EntityFactory;
	sto: StorageEngine;
	containsIndependent?: boolean;
	fillTable?: boolean;
}) => {
	const resource = ef.create("Resource", {
		name: "Test",
		attachment: {
			type: "TabularData",
			bytesPerElement: 8,
			begin: createIDatetime(new Date(0)),
			end: createIDatetime(new Date(1)),
			columns: [
				createColumnDescription(-1),
				createColumnDescription(containsIndependent ? 0 : -1),
				createColumnDescription(containsIndependent ? 0 : -1),
			],
			hash: {
				type: "sha256",
				value: "test",
			},
		},
	});

	const path = ResourceAttachmentManager.getPath(resource.id);

	const stream = TabularData.createWriteStream(sto, path);
	if (fillTableOption) {
		await fillTable(stream);
	}

	return resource;
};

async function spy({
	td,
	sp,
	dispatchResult,
}: {
	td: TaskDispatcher;
	sp: SubscriptionPublisher;
	dispatchResult?: [number, number][][];
}) {
	let spy1: MockInstance<any[]> | undefined;
	if (dispatchResult) {
		// Configure the task dispatcher to return a dummy data set as a downsampling result.
		spy1 = vi.spyOn(td, "dispatch").mockImplementation(() => {
			return Promise.resolve(dispatchResult);
		});
	}

	// Create a promise that resolves when the event is emitted
	let spy2: MockInstance<any[]> | undefined;
	const eventResult = await new Promise((resolve) => {
		spy2 = vi.spyOn(sp, "publish").mockImplementation((a, b) => {
			resolve([a, b]);
		});
	});

	return { eventResult, spy1, spy2 };
}

describe("Downsampling service", () => {
	async function setup() {
		const { sc } = await createTestDb();
		// Set the base URL to a dummy value
		sc.set(new RemoteServicesConfig({ baseURL: new URL("http://localhost") }));
		sc.set(new RepositoryInfo("test"));

		const sto: StorageEngine = sc.set(new FileSystemStorageEngine(await mkdirTmp()));

		return {
			sto,
			el: sc.get(EntityLoader),
			ef: sc.get(EntityFactory),
			downsampling: sc.get(Downsampling),
			td: sc.get(TaskDispatcher),
			sp: sc.get(SubscriptionPublisher),
			schema: sc.get(DrizzleSchema),
		};
	}

	test("dispatches task and emits event upon completion", async () => {
		const {
			sto,
			el,
			ef,
			downsampling,
			td,
			sp,
			schema: { Resource },
		} = await setup();

		const resource = await createTable({ ef: ef, sto: sto });
		await el.insert(Resource, resource);
		const graph = await downsampling.requestGraph({ resourceId: resource.id, datapoints: 18 });

		// Should return "downsampling_pending" because downsampling has not completed yet
		expect(graph.type).toBe("downsampling_pending");

		// Wait for the event to be emitted. After this time, the file should be accessible when we call `requestGraph`
		// again.
		const { spy1, spy2, eventResult } = await spy({ td, sp, dispatchResult: [[[0, 0]], [[0, 0]]] });
		expect(eventResult).toBeDefined();

		// Get the same data again. This time it should be returned instead of undefined
		const graph2 = await downsampling.requestGraph({ resourceId: resource.id, datapoints: 18 });

		expect(graph2.type).toBe("data");
		expect(graph2).toBeDefined();

		// Make sure the task dispatcher was correctly called
		expect(spy1).toHaveBeenCalledTimes(1);
		assertDefined(spy1);
		expect(spy1.mock.calls[0][0]).toBe("resources/downsample");

		// Make sure the correct event was emitted
		expect(spy2).toHaveBeenCalledTimes(1);
		expect(spy2?.mock.calls[0][0]).toBe("downsampleDataBecameReady");
	});

	test("returns error if dependent variables are missing in resource", async () => {
		const {
			sto,
			el,
			ef,
			downsampling,
			td,
			sp,
			schema: { Resource },
		} = await setup();

		const resource = await createTable({ ef: ef, sto: sto, containsIndependent: false });
		await el.insert(Resource, resource);
		const graph = await downsampling.requestGraph({ resourceId: resource.id, datapoints: 18 });

		// Should return "downsampling_pending" because downsampling has not completed yet
		expect(graph.type).toBe("downsampling_pending");

		// Wait for the event to be emitted. After this time, the file should be accessible when we call `requestGraph`
		// again.
		await spy({ td, sp });

		const result = await downsampling.requestGraph({ resourceId: resource.id, datapoints: 18 });
		expect(result.type).toBe("permanent_error");
		assert(result.type === "permanent_error");
		expect(result.message).toMatch("not contain any dependent columns");
	});

	test("returns error if resource is empty", async () => {
		const {
			sto,
			el,
			ef,
			downsampling,
			td,
			sp,
			schema: { Resource },
		} = await setup();

		const resource = await createTable({
			ef: ef,
			sto: sto,
			containsIndependent: false,
			fillTable: false,
		});
		await el.insert(Resource, resource);
		const graph = await downsampling.requestGraph({ resourceId: resource.id, datapoints: 18 });

		// Should return "downsampling_pending" because downsampling has not completed yet
		expect(graph.type).toBe("downsampling_pending");

		// Wait for the event to be emitted. After this time, the file should be accessible when we call `requestGraph`
		// again.
		await spy({ td, sp });

		const result = await downsampling.requestGraph({ resourceId: resource.id, datapoints: 18 });
		expect(result.type).toBe("permanent_error");
		assert(result.type === "permanent_error");
		expect(result.message).toMatch("not contain any rows");
	});
});

function fillTable(stream: Writable<number[]>) {
	stream.write([0, 2, 9]);
	stream.write([1, 4, 1]);
	stream.write([2, 6, 1]);
	stream.write([3, 8, 1]);
	stream.write([4, 2, 9]);
	stream.write([5, 4, 5]);
	stream.write([6, 6, 9]);
	stream.write([7, 8, 9]);
	stream.write([8, 2, 1]);
	stream.write([9, 4, 5]);
	stream.end();

	return stream.promise();
}
