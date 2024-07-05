import { pseudoRandom } from "./projectConfig";

export function getSeededRandomElement<T>(items: T[]): T {
	return items[Math.floor(pseudoRandom() * items.length)];
}

export function getSeededRandomInt(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(pseudoRandom() * (max + 1 - min) + min);
}
