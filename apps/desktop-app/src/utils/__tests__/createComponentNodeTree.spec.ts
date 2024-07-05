import type { FragmentRefs } from "relay-runtime";
import { expect, test } from "vitest";

import { createComponentNodeTree } from "../../components/componentNodeTreeProvider/ComponentNodeTreeProvider";

import type { ComponentNodeTreeProviderFragment$data } from "@/relay/ComponentNodeTreeProviderFragment.graphql";
import { createIDatetime } from "~/lib/createDate";

test("createComponentNodeTree", () => {
	// The value property is not used by the function under test, so we can omit it.
	const fakeRef = {
		value: null as unknown as {
			readonly " $fragmentSpreads": FragmentRefs<"DeviceLink">;
		},
	};

	const components: ComponentNodeTreeProviderFragment$data["components"] = [
		{
			component: {
				__typename: "Sample",
				id: "s",
				name: "PL-Pd-Pt-CZ",
				usagesAsProperty: [
					{
						name: "sample",
						timestamp: createIDatetime(new Date(0)),
						timestampEnd: createIDatetime(new Date(0)),
						id: "fakePropertyId",
						device: { id: "fakeDeviceId" },
						...fakeRef,
					},
				],
			},
			pathFromTopLevelDevice: ["furnace", "tube", "sample"],
		},
		{
			component: {
				__typename: "Device",
				id: "t",
				name: "Quartz tube",
				displayName: "Quartz tube",
				usagesAsProperty: [
					{
						name: "tube",
						timestamp: createIDatetime(new Date(0)),
						timestampEnd: createIDatetime(new Date(0)),
						id: "fakePropertyId",
						device: { id: "fakeDeviceId" },
						...fakeRef,
					},
				],
				definition: {
					acceptsUnit: [],
				},
			},
			pathFromTopLevelDevice: ["furnace", "tube"],
		},
		{
			component: {
				__typename: "Device",
				id: "f",
				name: "My furnace",
				displayName: "My furnace",
				usagesAsProperty: [
					{
						name: "furnace",
						timestamp: createIDatetime(new Date(0)),
						timestampEnd: createIDatetime(new Date(0)),
						id: "fakePropertyId",
						device: { id: "fakeDeviceId" },
						...fakeRef,
					},
				],
				definition: {
					acceptsUnit: [],
				},
			},
			pathFromTopLevelDevice: ["furnace"],
		},
		{
			component: {
				__typename: "Device",
				id: "m",
				name: "mfc x",
				displayName: "mfc x",
				usagesAsProperty: [
					{
						name: "mfc1",
						timestamp: createIDatetime(new Date(0)),
						timestampEnd: createIDatetime(new Date(0)),
						id: "fakePropertyId",
						device: { id: "fakeDeviceId" },
						...fakeRef,
					},
				],
				definition: {
					acceptsUnit: [],
				},
			},
			pathFromTopLevelDevice: ["mfc1"],
		},
	];
	expect(createComponentNodeTree(components)).toMatchSnapshot();
});
