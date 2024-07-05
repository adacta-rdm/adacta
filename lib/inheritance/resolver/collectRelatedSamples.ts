import assert from "node:assert";

import { eq } from "drizzle-orm";

import type { ISampleId } from "../../database/Ids";
import type { ISampleTraversalResult } from "../deriveSpecifications";

import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";

export async function collectRelatedSamples(
	startId: ISampleId,
	el: EntityLoader,
	schema: DrizzleSchema,
	level = 0
): Promise<ISampleTraversalResult[]> {
	const { SampleToSample } = schema;
	const samples: ISampleTraversalResult[] = [];
	samples.push({ sample: startId, level });

	const parents = await el.find(SampleToSample, (t) => eq(t.sample2, startId));
	assert(parents.length <= 1, "Sample must have one or no parent");

	// If there is no parent we are done as it is the root of the tree
	if (parents.length === 0) {
		return samples;
	}

	const parent = parents[0];

	samples.push(...(await collectRelatedSamples(parent.sample1, el, schema, ++level)));

	return samples;
}
