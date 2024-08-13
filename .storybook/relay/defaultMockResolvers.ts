import type { TypedMockResolvers, TypeMockResolverContext } from "~/.storybook/relay/withRelay";
import { createIDatetime } from "~/lib/createDate";
import { uuid } from "~/lib/uuid";

/**
 * Default resolvers for this project.
 * These resolvers should provide some defaults which make sense for the whole project (i.e.
 * generation of a username).
 *
 * Resolvers which are only applicable to a specific test (i.e. amount of Devices returned by a
 * DeviceEdge) should not be added here.
 */
export function defaultMockResolvers(): TypedMockResolvers {
	const userNames = ["Max", "Moritz"];
	const deviceNames = ["MFC", "FTIR", "Thermocouple"];

	let userNameCounter = 0;

	function getUserName() {
		return userNames[++userNameCounter % userNames.length];
	}

	let deviceNameCounter = 0;

	function getDeviceName() {
		return deviceNames[++deviceNameCounter % deviceNames.length];
	}

	function getAcceptsUnit(random: TypeMockResolverContext["random"]) {
		const amount = random.intBetween(1, 2);

		const kinds = ["temperature", "volumetric_flow", "mass_flow"];

		const stack = [];
		for (let i = 0; i < amount; i++) {
			stack.push(random.itemFrom(kinds));
		}

		return stack;
	}

	return {
		// DateTime is a scalar which only works if operation is tagged with @relay_test_operation
		DateTime() {
			return createIDatetime(new Date());
		},
		User() {
			return { name: getUserName() };
		},
		DateOptions() {
			return {
				locale: "de-DE",
				dateStyle: "short",
				timeStyle: "short",
			};
		},
		Device() {
			return {
				name: getDeviceName(),
				freeComponents: new Array(5).fill(""),
			};
		},
		Sample() {
			return {
				name: "Sample",
				devices: new Array(5).fill(""),
			};
		},
		ID() {
			return uuid();
		},
		String({ name, random }) {
			const fieldName = name;

			if (
				fieldName?.toLowerCase().includes("timestamp") ||
				fieldName === "begin" ||
				fieldName === "end"
			) {
				const now = new Date().getTime();
				const hoursDiff = Math.floor(random() * 24 * 7);
				const diff = hoursDiff * 60 * 60 * 1000;
				return createIDatetime(new Date(now - diff));
			}

			if (fieldName === "dataURI") {
				const x = 100 + Math.floor(random() * 100);
				const y = 100 + Math.floor(random() * 200);
				return `https://picsum.photos/${x}/${y}?r=${Math.random()}`;
			}

			return undefined;
		},
		DeviceDefinition({ random }) {
			return {
				acceptsUnit: getAcceptsUnit(random),
			};
		},
		DataSeries({ random }) {
			const values = [];
			for (let i = 0; i < 4; i++) {
				values.push(random.intBetween(i, i + 4));
			}

			return { values, unit: "°C", label: "Test" };
		},
	};
}
