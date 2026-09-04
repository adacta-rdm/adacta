/**
 * Reading the seed tree.
 *
 * A seed entity is one JSON file, and the file name without the extension is
 * its key. Other files refer to it by that key. For example a batch names its
 * preparer "gossler", which is the file "seed/users/gossler.json".
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * The seed tree sits beside this file. Paths are resolved against the module.
 * The seed therefore runs from any working directory.
 */
const SEED = import.meta.dir;

/**
 * The key of a seed file, which is its name without the extension. For example
 * "seed/users/dev.json" has the key "dev".
 */
export function keyOf(file: string): string {
	return basename(file, ".json");
}

/**
 * A path inside the seed tree.
 */
export function seedPath(...segments: string[]): string {
	return join(SEED, ...segments);
}

/**
 * The subdirectories of a seed directory, in name order. Each one is an entity
 * that holds more than a single file. For example "repo/demo" is a repository
 * with its own inventory and samples.
 */
export function subdirs(...segments: string[]): string[] {
	const directory = seedPath(...segments);

	if (!existsSync(directory)) return [];

	return readdirSync(directory, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
}

/**
 * Every JSON file in a seed directory, as full paths in name order.
 *
 * A missing directory holds no files. A repository that seeds no samples
 * therefore needs no empty "samples" directory.
 */
export function jsonFiles(...segments: string[]): string[] {
	const directory = seedPath(...segments);

	if (!existsSync(directory)) return [];

	return readdirSync(directory)
		.filter((file) => file.endsWith(".json"))
		.sort()
		.map((file) => join(directory, file));
}

export function readJson<T>(file: string): T {
	return JSON.parse(readFileSync(file, "utf-8")) as T;
}
