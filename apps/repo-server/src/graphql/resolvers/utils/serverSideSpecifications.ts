import { eq } from "drizzle-orm";

import type { EntityLoader } from "../../../services/EntityLoader";
import type { ISpecification } from "../../generated/requests";

import { serverSideDeviceSpecificationsSQL } from "~/apps/repo-server/src/graphql/resolvers/utils/serverSideDeviceSpecificationsSQL";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import type { IDeviceId, ISampleId } from "~/lib/database/Ids";
import { convertSampleToTraversalResult } from "~/lib/inheritance/convertToTraversalResult";
import { deriveSpecifications } from "~/lib/inheritance/deriveSpecifications";
import { collectRelatedSamples } from "~/lib/inheritance/resolver/collectRelatedSamples";

/**
 * Usually specifications are derived on the client side to allow the client to update views more
 * easily (since relay works best with a flat data structure).
 * This function allows to derive specifications on the server side.
 * This can be used whenever the server needs direct access to the derived specifications.
 */
export type TDerivationArgs = { type: "Device"; id: IDeviceId } | { type: "Sample"; id: ISampleId };

export async function serverSideSpecifications(
	{ type, id }: TDerivationArgs,
	ctx: { el: EntityLoader; schema: DrizzleSchema }
): Promise<ISpecification[]> {
	if (type === "Device") {
		return serverSideDeviceSpecificationsSQL(id, ctx);
	}

	const { el, schema } = ctx;
	const { Sample, SampleSpecification } = schema;

	const specifications = await el.drizzle
		.select({ name: SampleSpecification.name, value: SampleSpecification.value })
		.from(SampleSpecification)
		.where(eq(SampleSpecification.ownerId, id));

	const definitions = convertSampleToTraversalResult(
		specifications,
		await Promise.all(
			(
				await collectRelatedSamples(id, el, schema)
			).map((s) => {
				return (async () => {
					const sample = await el.one(Sample, s.sample);

					return {
						...s,
						sample: {
							id: sample.id,
							name: sample.name,
							specifications,
						},
					};
				})();
			})
		)
	);

	const specificationsFromDefinitions = deriveSpecifications(definitions).map((s) => ({
		name: s.name,
		value: s.value,
		level: s.level,
	}));

	return [
		...specifications.map((s) => ({ name: s.name, value: s.value, level: 0 })),
		...specificationsFromDefinitions,
	].sort((a, b) => {
		const levelDiff = b.level - a.level;
		if (levelDiff !== 0) {
			return levelDiff;
		}

		return a.name.localeCompare(b.name);
	});
}
