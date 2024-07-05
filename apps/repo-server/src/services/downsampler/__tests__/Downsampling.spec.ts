import { mkdirTmp } from "@omegadot/fs";
import type { StorageEngine } from "@omegadot/storage-engine";
import { FileSystemStorageEngine } from "@omegadot/storage-engine";
import type { Writable } from "@omegadot/streams";
import { TabularData } from "@omegadot/tabular-data";
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
import { createIDatetime } from "~/lib/createDate";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type { IDeviceId } from "~/lib/database/Ids";
import type { ITabularDataColumnDescription } from "~/lib/interface/ITabularDataColumnDescription";

const createColumnDescription = (independent: boolean): ITabularDataColumnDescription => ({
	type: "number",
	deviceId: "123" as IDeviceId,
	description: "",
	unit: "",
	title: "",
	columnId: "",
	independentVariables: independent ? [] : [0],
});

const createTable = async (ef: EntityFactory, sto: StorageEngine) => {
	const resource = ef.create("Resource", {
		name: "Test",
		attachment: {
			type: "TabularData",
			bytesPerElement: 8,
			begin: createIDatetime(new Date(0)),
			end: createIDatetime(new Date(1)),
			columns: [
				createColumnDescription(true),
				createColumnDescription(false),
				createColumnDescription(false),
			],
			hash: {
				type: "sha256",
				value: "test",
			},
		},
	});

	const path = ResourceAttachmentManager.getPath(resource.id);

	const stream = TabularData.createWriteStream(sto, path);
	await fillTable(stream);

	return resource;
};

describe("Downsampling service", () => {
	async function setup() {
		const { sc } = await createTestDb();
		// Set the base URL to a dummy value
		sc.set(new RemoteServicesConfig({ baseURL: new URL("http://localhost") }));
		sc.set(new RepositoryInfo("test"));

		const sto: StorageEngine = sc.set(new FileSystemStorageEngine(await mkdirTmp()));
		const stream = TabularData.createWriteStream(sto, "temp", 3);
		await fillTable(stream);

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

		// Configure the task dispatcher to return a dummy data set as a downsampling result.
		const spy1 = vi
			.spyOn(td, "dispatch")
			.mockImplementation(() => Promise.resolve([[[0, 0]], [[0, 0]]]));

		// Create a promise that resolves when the event is emitted
		let spy2: MockInstance<any[]> | undefined;
		const promise = new Promise((resolve) => {
			spy2 = vi.spyOn(sp, "publish").mockImplementation(resolve);
		});

		const resource = await createTable(ef, sto);
		await el.insert(Resource, resource);
		const graph = await downsampling.requestGraph({ resourceId: resource.id, datapoints: 18 });

		// Should return undefined because downsampling has not completed yet
		expect(graph).toBeUndefined();

		// Wait for the event to be emitted. After this time, the file should be accessible when we call `requestGraph`
		// again.
		await promise;

		// Get the same data again. This time it should be returned instead of undefined
		const graph2 = await downsampling.requestGraph({ resourceId: resource.id, datapoints: 18 });

		expect(graph2).toBeDefined();

		// Make sure the task dispatcher was correctly called
		expect(spy1).toHaveBeenCalledTimes(1);
		expect(spy1.mock.calls[0][0]).toBe("resources/downsample");

		// Make sure the correct event was emitted
		expect(spy2).toHaveBeenCalledTimes(1);
		expect(spy2?.mock.calls[0][0]).toBe("downsampleDataBecameReady");
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
