import type { IKeyValueDocument, KeyValueDatabase } from "./KeyValueDatabase";

import { RawTextReader } from "~/lib/rawTextReader/RawTextReader";
import { Service } from "~/lib/serviceContainer/ServiceContainer";
import { StorageEngine } from "~/lib/storage-engine";
import { sha256 } from "~/lib/utils/sha256";

type TypeStringToTypename<T> = Extract<IKeyValueDocument, { type: T }>;

/**
 * Simple Persistent-KV implementation which writes/reads into/from a StorageEngine
 */
@Service(StorageEngine)
export class KeyValueDatabaseStorageEngineBackend implements KeyValueDatabase {
	private sto: StorageEngine;

	constructor(backingStorageEngine: StorageEngine) {
		// console.trace("Engine", backingStorageEngine);
		this.sto = backingStorageEngine;
	}

	async get<T extends IKeyValueDocument["type"]>(
		key: string,
		type?: T
	): Promise<TypeStringToTypename<T> | undefined> {
		try {
			const fileName = this.translateKeyToFileName(key);
			const { text } = await new RawTextReader(fileName, this.sto).text(0);

			const obj = JSON.parse(text) as TypeStringToTypename<T>;

			if (type && obj.type !== type) return undefined;

			return obj;
		} catch (e) {
			return undefined;
		}
	}

	async has(key: string): Promise<boolean> {
		try {
			return (await this.sto.size(this.translateKeyToFileName(key))) > 0;
		} catch (e) {
			return false;
		}
	}

	async set(key: string, value: IKeyValueDocument): Promise<void> {
		const contents = Buffer.from(JSON.stringify(value), "utf-8");
		await this.sto.write(this.translateKeyToFileName(key), contents);
	}

	// This method cant be static as it requires the TKey type as parameter (Static members cannot
	// reference class type parameters)
	// eslint-disable-next-line class-methods-use-this
	private translateKeyToFileName(key: string) {
		const hash = sha256(key);

		// Hash the key to get rid of any special characters which could cause issues
		return `KVDB_${hash}`;
	}
}
