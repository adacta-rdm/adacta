import { eq } from "drizzle-orm";

import { EntityAlreadyExistsError } from "~/app/lib/error/EntityAlreadyExistsError.ts";
import { SlugAllocationError } from "~/app/lib/error/SlugAllocationError.ts";
import { slugify } from "~/app/lib/slugs.ts";
import type { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import type { Entity, NewEntity } from "~/drizzle/Schema.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { Sample } from "~/drizzle/schema/Sample.ts";
import { id53 } from "~/lib/id53/id53.ts";
import { isUniqueConstraintOn } from "~/lib/sqlite-errors/isUniqueConstraintOn.ts";

type SampleValues = Omit<NewEntity<"Sample">, "slug" | "id">;

const SLUG_ATTEMPTS = 5;

/**
 * Adds one sample to a batch.
 *
 * A label is unique within its batch. The label of an archived sample stays
 * reserved.
 *
 * The function generates the ID and slug. All other sample values are supplied
 * by the caller.
 *
 * @throws EntityAlreadyExistsError if the batch already contains the name.
 * @throws SlugAllocationError if five generated slugs are already in use.
 */
export async function addSample(
	db: ApplicationDatabase,
	values: SampleValues,
): Promise<Entity<"Sample">> {
	const base = slugify(values.name);
	let slug = base;
	for (let i = 0; i < SLUG_ATTEMPTS; i++) {
		try {
			const id = id53();
			await db.batch([
				db.insert(Id).values({ id }),
				db.insert(Sample).values({ ...values, slug, id }),
			]);

			return (await db.select().from(Sample).where(eq(Sample.id, id)).get())!;
		} catch (error) {
			if (isUniqueConstraintOn(error, [Sample.name])) {
				throw new EntityAlreadyExistsError("Sample", "name", values.name);
			}

			// Another insertion can take the selected slug before this insertion begins.
			if (isUniqueConstraintOn(error, [Sample.slug])) {
				slug = `${base}-${i + 2}`;
				continue;
			}

			throw error;
		}
	}

	throw new SlugAllocationError("sample", values.name, base, SLUG_ATTEMPTS);
}
