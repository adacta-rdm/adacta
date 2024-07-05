import lodash from "lodash";

import type { IDeviceDefinitionId, ISampleId } from "~/lib/database/Ids";

interface ITraversalMetadata {
	/**
	 * Length of shortest path from initial Device/DeviceDefinition to the Specification
	 */
	level: number;
}

export interface ISpecificationTraversalResult extends ITraversalMetadata {
	name: string;
	value: string;
	source?: { id: string; name: string };
	skipped?: boolean; // TODO: Add into different interface?
}

/**
 * Contains a reference to the definition and metadata about the traversal
 * Used
 */
export interface IDeviceDefinitionTraversalResult extends ITraversalMetadata {
	definition: IDeviceDefinitionId;
}

export interface ISampleTraversalResult extends ITraversalMetadata {
	sample: ISampleId;
}

export function deriveSpecifications(
	specifications: ISpecificationTraversalResult[],
	includeSkipped = false
): ISpecificationTraversalResult[] {
	const grouped = Object.values(lodash.groupBy(specifications, (s) => s.name));

	return grouped
		.flatMap((group) => {
			if (group.length == 1) {
				return selectElement(group, includeSkipped);
			}

			// Sort ascending by level
			group.sort((a, b) => a.level - b.level);

			return selectElement(group, includeSkipped);
		})
		.flat();
}

function selectElement(elements: ISpecificationTraversalResult[], includeSkipped: boolean) {
	if (!includeSkipped) {
		return elements[0];
	}

	const [first, ...skipped] = elements;
	return [first, skipped.map((s) => ({ ...s, skipped: true }))];
}
