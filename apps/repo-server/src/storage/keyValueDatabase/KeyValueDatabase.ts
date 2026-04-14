import type { Promisable } from "type-fest";

import type {
	LongTermCacheResult,
	ShortTermCacheResult,
} from "../../services/downsampler/Downsampling";

/**
 * Storage abstraction for various possible backends which provide a way to persist Key-Value pairs.
 * Possible use-cases include the storage of down sampled data
 *
 * IMPORTANT: Make sure to implement some name spacing to allow the same keys to exist in different
 * KV-storages
 *
 *        // Namespacing example
 *        instance1 = PersistentKeyValueStorageImpl("namespace-a");
 *        instance1.set("foo", "bar");
 *        instance2 = PersistentKeyValueStorageImpl("namespace-b");
 *        instance2.get("foo") // Should not return "bar"
 *
 */
export abstract class KeyValueDatabase {
	/**
	 *
	 * @param key
	 * @param type expected type (if not set to undefined the return type is narrowed and asserted)
	 */
	abstract get<T extends IKeyValueDocument["type"]>(
		key: string,
		type?: T
	): Promisable<Extract<IKeyValueDocument, { type: T }> | undefined>;

	abstract has(key: string): Promisable<boolean>;

	abstract set(key: string, value: IKeyValueDocument): Promisable<void>;
}

/**
 * Type for documents which can be stored in the KeyValueDatabase
 */
export type IKeyValueDocument =
	| {
			type: "ShortTermCacheResult";
			data: ShortTermCacheResult;
	  }
	| {
			type: "LongTermCacheResult";
			data: LongTermCacheResult;
	  }
	| { type: "string"; data: string };
