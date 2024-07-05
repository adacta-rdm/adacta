import { timeFrameArgumentInterpretation } from "./timeFrameArgumentInterpretation";
import { getUsagesAsProperty } from "../../../utils/getUsagesAsProperty";
import type { IGraphQLContext } from "../../IGraphQLContext";
import type { ITimeFrameInput, Maybe } from "../../generated/resolvers";

import type { IDeviceId, IPropertyId, ISampleId } from "~/lib/database/Ids";

// Shared resolver between Device & Sample
export async function usagesAsProperty(
	{ id }: { id: IDeviceId | ISampleId },
	{
		timeFrame,
		time,
		includeOverlaps,
	}: {
		timeFrame?: Maybe<ITimeFrameInput>;
		time?: Maybe<string>;
		includeOverlaps?: Maybe<boolean>;
	},
	{ services: { el }, schema: { Property } }: IGraphQLContext
): Promise<{ id: IPropertyId }[]> {
	if (time !== undefined && timeFrame !== undefined) {
		throw new Error("You can either provide `timeFrame` or `time`");
	}

	const [begin, end] = timeFrameArgumentInterpretation(time, timeFrame);

	const usages = await getUsagesAsProperty(
		el,
		Property,
		id,
		begin && end ? { begin, end } : undefined,
		includeOverlaps ?? undefined
	);

	return usages.map(({ id }) => ({ id }));
}
