import { readFileSync, readdirSync } from "node:fs";
import { basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const seedPath = (...segments: string[]) =>
	fileURLToPath(new URL(["../seed", ...segments].join("/"), import.meta.url));

export interface SeedUser {
	key: string;
	email: string;
	name: string;
	password: string;
}

export interface SeedInventoryEntry {
	key: string;
	name: string;
	kind: "rig" | "equipment";
}

export interface SeedSampleBatch {
	key: string;
	name: string;
	preparationDate: string;
	preparedBy: string;
	activeMaterial: string;
	support: string;
	samples: string[];
}

export interface SeedPreset {
	key: string;
	name: string;
}

/**
 * The preset exercised by the browser suite. Its directory is part of the
 * committed development seed.
 */
export const SEED_PRESET = "demo";

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, "utf8")) as T;
}

/**
 * Read a seed directory and add the filename as each record's key. For example,
 * `dev.json` receives the key `dev`.
 */
function readSeedDirectory<T extends object>(
	...segments: string[]
): readonly (T & { key: string })[] {
	const directory = seedPath(...segments);

	return readdirSync(directory)
		.filter((name) => extname(name) === ".json")
		.map((name) => ({
			...readJson<T>(`${directory}/${name}`),
			key: basename(name, ".json"),
		}));
}

/**
 * Return the record with this key. The error lists the available keys when the
 * seed no longer contains it.
 */
function pick<T extends { key: string }>(entries: readonly T[], kind: string, key: string): T {
	const match = entries.find((entry) => entry.key === key);
	if (match) return match;

	throw new Error(
		`No seed ${kind} has key "${key}". Known keys: ${entries.map((entry) => entry.key).join(", ")}`,
	);
}

const users = readSeedDirectory<Omit<SeedUser, "key">>("users");
const inventory = readSeedDirectory<
	{ kind: "rig"; name: string } | { kind: "equipment"; product: string }
>("presets", SEED_PRESET, "inventory").map((entry): SeedInventoryEntry => {
	if (entry.kind === "rig") return entry;
	const product = readJson<{ name: string }>(
		seedPath(
			"presets",
			SEED_PRESET,
			"catalog",
			entry.product.split("/")[0],
			"products",
			`${entry.product.split("/")[1]}.json`,
		),
	);
	return { key: entry.key, kind: entry.kind, name: product.name };
});

const sampleBatches = readSeedDirectory<Omit<SeedSampleBatch, "key">>(
	"presets",
	SEED_PRESET,
	"samples",
);

export const SEED_PRESET_INFO: SeedPreset = {
	...readJson<Omit<SeedPreset, "key">>(seedPath("presets", SEED_PRESET, "preset.json")),
	key: SEED_PRESET,
};

export const seedUser = (key: string): SeedUser => pick(users, "user", key);
export const seedInventoryEntry = (key: string): SeedInventoryEntry =>
	pick(inventory, "inventory entry", key);
export const seedSampleBatch = (key: string): SeedSampleBatch =>
	pick(sampleBatches, "sample batch", key);

export function seedCatalogManufacturer(key: string): { name: string } {
	return readJson(seedPath("presets", SEED_PRESET, "catalog", key, "manufacturer.json"));
}

export function seedCatalogProduct(
	manufacturer: string,
	key: string,
): { name: string; productNumber: string } {
	return readJson(
		seedPath("presets", SEED_PRESET, "catalog", manufacturer, "products", `${key}.json`),
	);
}
