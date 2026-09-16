import { DrizzleQueryError } from "drizzle-orm";

import { EntityAlreadyExistsError } from "~/app/lib/error/EntityAlreadyExistsError.ts";
import { SlugAllocationError } from "~/app/lib/error/SlugAllocationError.ts";
import { slugify } from "~/app/lib/slugs.ts";
import type { RepoDB } from "~/app/services/RepoDB.ts";
import type { Entity, NewEntity } from "~/drizzle/Schema.ts";
import { Sample } from "~/drizzle/schema/repo.Sample.ts";

type SampleValues = Omit<NewEntity<"Sample">, "slug">;

const SLUG_ATTEMPTS = 5;

/**
 * Adds one sample to a batch.
 *
 * A label is unique within its batch. The label of an archived sample stays
 * reserved.
 *
 * The function generates the slug. All other sample values are supplied by
 * the caller.
 *
 * @throws EntityAlreadyExistsError if the batch already contains the name.
 * @throws SlugAllocationError if five generated slugs are already in use.
 */
export async function addSample(db: RepoDB, values: SampleValues): Promise<Entity<"Sample">> {
	const base = slugify(values.name);
	let slug = base;
	for (let i = 0; i < SLUG_ATTEMPTS; i++) {
		try {
			return await db
				.insert(Sample)
				.values({ ...values, slug })
				.returning()
				.get();
		} catch (error) {
			if (isUniqueConstraintOn(error, "Sample.sample_batch_id, Sample.name")) {
				throw new EntityAlreadyExistsError("Sample", "name", values.name);
			}

			// Another insertion can take the selected slug before this insertion
			// begins. Reading the slugs again produces the next available suffix.
			if (isUniqueConstraintOn(error, "Sample.sample_batch_id, Sample.slug")) {
				slug = `${base}-${i + 2}`;
				continue;
			}

			throw error;
		}
	}

	throw new SlugAllocationError("sample", values.name, base, SLUG_ATTEMPTS);
}

function isUniqueConstraintOn(error: unknown, columns: string): boolean {
	// Drizzle wraps the SQLite error. SQLite identifies a unique constraint by
	// its columns in the message instead of reporting the index name.
	const databaseError = error instanceof DrizzleQueryError ? error.cause : error;

	return (
		databaseError instanceof Error &&
		"code" in databaseError &&
		databaseError.code === "SQLITE_CONSTRAINT_UNIQUE" &&
		databaseError.message === `UNIQUE constraint failed: ${columns}`
	);
}
