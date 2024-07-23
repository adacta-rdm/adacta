import seedrandom from "seedrandom";

import type { TypedMockResolvers } from "~/.storybook/relay/withRelay";
import { createIDatetime } from "~/lib/createDate";
import { uuid } from "~/lib/uuid";
export const pseudoRandom = seedrandom("ADACTA_STATIC_SEED");

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

function getAcceptsUnit() {
	const amount = getSeededRandomInt(1, 2);

	const kinds = ["temperature", "volumetric_flow", "mass_flow"];

	const stack = [];
	for (let i = 0; i < amount; i++) {
		stack.push(getSeededRandomElement(kinds));
	}

	return stack;
}

/**
 * Default resolvers for this project.
 * These resolvers should provide some defaults which make sense for the whole project (i.e.
 * generation of a username).
 *
 * Resolvers which are only applicable to a specific test (i.e. amount of Devices returned by a
 * DeviceEdge) should not be added here.
 */
export const defaultMockResolvers: TypedMockResolvers = {
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
	String(ctx) {
		const fieldName = ctx?.name;

		if (
			fieldName?.toLowerCase().includes("timestamp") ||
			fieldName === "begin" ||
			fieldName === "end"
		) {
			const now = new Date().getTime();
			const hoursDiff = Math.floor(pseudoRandom() * 24 * 7);
			const diff = hoursDiff * 60 * 60 * 1000;
			return createIDatetime(new Date(now - diff));
		}

		if (fieldName === "dataURI") {
			const x = 100 + Math.floor(pseudoRandom() * 100);
			const y = 100 + Math.floor(pseudoRandom() * 200);
			return `https://picsum.photos/${x}/${y}?r=${Math.random()}`;
		}

		return undefined;
	},
	DeviceDefinition() {
		return {
			acceptsUnit: getAcceptsUnit(),
		};
	},
	DataSeries() {
		const values = [];
		for (let i = 0; i < 4; i++) {
			values.push(getSeededRandomInt(i, i + 4));
		}

		return { values, unit: "°C", label: "Test" };
	},
};

export function getSeededRandomElement<T>(items: T[]): T {
	return items[Math.floor(pseudoRandom() * items.length)];
}

export function getSeededRandomInt(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(pseudoRandom() * (max + 1 - min) + min);
}
