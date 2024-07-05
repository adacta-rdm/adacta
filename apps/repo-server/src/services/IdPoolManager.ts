import { eq, sql } from "drizzle-orm";

import { EntityLoader } from "./EntityLoader";
import { shuffle } from "../utils/shuffle";
import { toBase } from "../utils/toBase";

import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type { IIdPoolId } from "~/lib/database/Ids";
import { InvalidArgumentError } from "~/lib/errors/InvalidArgumentError";
import { Service } from "~/lib/serviceContainer/ServiceContainer";

/**
 * A service that manages ID pools. An ID pool is a collection of unique IDs that are generated deterministically based
 * on a counter stored in a database.
 *
 */
@Service(EntityLoader, EntityFactory, DrizzleSchema)
export class IdPoolManager {
	constructor(private el: EntityLoader, private ef: EntityFactory, private schema: DrizzleSchema) {}

	/**
	 * Creates a new ID pool with the provided alphabet and number of digits. The alphabet defines the characters that
	 * can be used in the generated IDs. The number of digits defines the length of the generated IDs. Several alphabet
	 * definitions are provided below.
	 *
	 * Note that the alphabet is shuffled before it is stored in the database. This is done to ensure that each pool
	 * has a different sequence of IDs.
	 */
	async createIdPool(args: IPoolArgs): Promise<DrizzleEntity<"IdPool">> {
		const { alphabet, digits } = args;
		// Shuffle the alphabet so each pool has a different sequence
		const pool = this.ef.create("IdPool", { digits, alphabet: shuffle(alphabet), counter: 0 });

		await this.el.drizzle.insert(this.schema.IdPool).values(pool).execute();

		return {
			...pool,
			counter: pool.counter ?? 0,
			metadataDeletedAt: pool.metadataDeletedAt ?? null, // TODO: Fix return type to make this unnecessary
		};
	}

	async getNextId(poolOrId: DrizzleEntity<"IdPool"> | IIdPoolId): Promise<string> {
		const entity =
			typeof poolOrId === "string" ? await this.el.one(this.schema.IdPool, poolOrId) : poolOrId;

		const increment = async (): Promise<number> => {
			const newCounter = await this.el.drizzle
				.update(this.schema.IdPool)
				.set({ counter: sql`${this.schema.IdPool.counter}+1` })
				.where(eq(this.schema.IdPool.id, entity.id))
				.returning({ counter: this.schema.IdPool.counter })
				.execute();

			// Subtract 1 because the counter is incremented before the value is returned.
			return newCounter[0].counter - 1;
		};

		const it = createIdPoolIterator(
			{ alphabet: entity.alphabet, digits: entity.digits },
			increment
		);

		const next = await it.next();

		if (next.done) {
			throw new PoolExhaustedError(entity.alphabet.length ** entity.digits);
		}
		return next.value;
	}
}

// Example alphabet definitions
export const base10 = "0123456789";
export const base16 = "0123456789abcdef";
export const base32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const base36 = "0123456789abcdefghijklmnopqrstuvwxyz";
export const base49 = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
export const base52 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const base58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

interface IPoolArgs {
	alphabet: string;
	digits: number;
}

/**
 * Returns an iterator that generates unique IDs containing the characters from the provided alphabet and the provided
 * number of digits. The second argument is a function that increments and returns the updated counter. It exists to
 * provide flexibility in the implementation of the counter. For example, it can be implemented as a simple synchronous
 * function, or as an asynchronous function that updates the counter in a database (see tests and the IdPoolManager
 * class for examples).
 *
 * The implementation is based on a linear congruential generator (LCG), where a pseudo-random number is generated in a
 * first step, and then mapped to the provided alphabet in a second step. The advantage in our application is that the
 * sequence is deterministic, and therefore repeatable, and does not require any additional storage space, for example
 * storing a list of already generated numbers to ensure uniqueness.
 * See also https://en.wikipedia.org/wiki/Linear_congruential_generator#Period_length.
 *
 * The LCG algorithm is defined by the following formula:
 * Xn+1 = (a * Xn + c) mod m
 * where:
 * X is the sequence of pseudorandom values, and
 * m,   0 < m         - the modulus
 * a,   0 < a < m     - the multiplier
 * c,   0 <= c < m    - the increment
 *
 * For certain choices of a and c, the algorithm will guarantee to generate all the integers in the range from
 * 0 to m − 1:
 *
 * 1. m and c are relatively prime
 * 2. a - 1 is divisible by all prime factors of m
 * 3. a - 1 is divisible by 4 if m is divisible by 4
 *
 * Condition 1 is satisfied by choosing c = m - 1 because any consecutive integers are relatively prime.
 * To avoid the integer factorization of m in satisfying condition 2, we adjust the value of m to divisible by 25. This
 * way, we can choose a = 1 + m / 5 to satisfy both conditions 2 and 3 and a < m.
 *
 * The downside to adjusting m is that the sequence will be longer than the user-defined size so there is a chance that
 * the next number in the sequence is outside the range [0, size - 1]. In this case, we simply get the next number in
 * the sequence until it is in the range. This can happen at most 24 times.
 */
export function createIdPoolIterator(
	args: IPoolArgs,
	increment: () => number
): IterableIterator<string>;
export function createIdPoolIterator(
	args: IPoolArgs,
	increment: () => Promise<number>
): AsyncIterableIterator<string>;
export function createIdPoolIterator(
	args: IPoolArgs,
	increment: (() => number) | (() => Promise<number>)
): IterableIterator<string> | AsyncIterableIterator<string> {
	const { alphabet, digits } = args;

	// Check alphabet for duplicates
	if (new Set(alphabet).size !== alphabet.length) {
		throw new InvalidArgumentError("Argument `alphabet` contains duplicates");
	}

	if (alphabet.length === 0) {
		throw new InvalidArgumentError("Argument `alphabet` must not be empty");
	}

	if (!Number.isSafeInteger(digits) || digits <= 0) {
		throw new InvalidArgumentError("Argument `digits` must be a positive non-zero integer");
	}

	const size = alphabet.length ** digits;

	// Increase m to be divisible by 25
	const m = size % 25 === 0 ? size : size + (25 - (size % 25));
	const a = 1 + m / 5;
	const c = m - 1;

	let async: boolean | undefined;

	return {
		next(): IteratorResult<string> | Promise<IteratorResult<string>> {
			const x = increment();

			const counter2Id = (x: number) => {
				// We are done when the next number in the sequence is outside the range [0, m - 1].
				// If we continue beyond this point, we will begin to repeat numbers.
				const done = x >= m;
				const permuted = (a * x + c) % m;
				// Because we have potentially increased m, we need to make sure that the next number is still in the range
				// [0, m - 1]. If not, we need to get the next number in the sequence.
				if (permuted >= size) return this.next();
				return { value: toBase(permuted, alphabet).padStart(digits, alphabet[0]), done };
			};

			if (typeof x === "number") return counter2Id(x);

			if (async === false) {
				throw new Error("Cannot call `next()` on an async iterator synchronously");
			}

			return x.then(counter2Id);
		},

		[Symbol.iterator]() {
			async = false;
			return this as IterableIterator<string>;
		},

		[Symbol.asyncIterator]() {
			async = true;
			return this as AsyncIterableIterator<string>;
		},
	} as IterableIterator<string> | AsyncIterableIterator<string>;
}

export class PoolExhaustedError extends Error {
	constructor(size: number) {
		super(`IdPool is exhausted (size: ${size})`);
	}
}
