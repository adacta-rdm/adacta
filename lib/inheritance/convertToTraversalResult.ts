import type { ISpecificationTraversalResult } from "./deriveSpecifications";

export function convertDeviceToTraversalResult(
	specifications: TSpecifications,
	definitions: TTypedParent<IDefinitions>,
	filterPropertiesDefinedStartingPoint = true
): ISpecificationTraversalResult[] {
	return convertToTraversalResult(
		specifications,
		definitions,
		(d) => d.definition,
		filterPropertiesDefinedStartingPoint
	);
}

export function convertSampleToTraversalResult(
	specifications: TSpecifications,
	definitions: TTypedParent<ISamples>,
	filterPropertiesDefinedStartingPoint = true
): ISpecificationTraversalResult[] {
	return convertToTraversalResult(
		specifications,
		definitions,
		(s) => s.sample,
		filterPropertiesDefinedStartingPoint
	);
}

/**
 * Helper function takes the type returned from the GraphQL resolver and:
 * - removes all specifications which are already defined at the device level
 * - turns all results into an ISpecificationTraversalResult which can be used by the
 *   `deriveSpecifications()` function
 * @param specifications of the device
 * @param parentsToMerge of the device
 * @param fn
 * @param filterPropertiesDefinedStartingPoint
 */
function convertToTraversalResult<T extends ISamples | IDefinitions>(
	specifications: ReadonlyArray<{ readonly name: string; readonly value: string }>,
	parentsToMerge: TTypedParent<T>,
	fn: (t: T) => ISpecificationReference,
	filterPropertiesDefinedStartingPoint = true
): ISpecificationTraversalResult[] {
	const existingNames = specifications.map((s) => s.name);
	return parentsToMerge.flatMap((d) => {
		const thing = fn(d);

		return thing.specifications.flatMap((s) => {
			const alreadyExists = existingNames.includes(s.name);

			if (filterPropertiesDefinedStartingPoint && alreadyExists) {
				return [];
			}

			return {
				...s,
				level: d.level,
				skipped: alreadyExists,

				source: { id: thing.id, name: thing.name },
			};
		});
	});
}

type TSpecifications = ReadonlyArray<{ readonly name: string; readonly value: string }>;

interface IParentsBase {
	readonly level: number;
}

type TTypedParent<T extends IDefinitions | ISamples> = ReadonlyArray<T & IParentsBase>;

interface ISpecificationReference {
	readonly id: string;
	readonly name: string;
	readonly specifications: TSpecifications;
}
interface IDefinitions {
	readonly definition: ISpecificationReference;
}

interface ISamples {
	readonly sample: ISpecificationReference;
}
