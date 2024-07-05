import { sortObjects } from "./sortObjects";

interface IPartialDeviceDefinition {
	readonly definitions: readonly {
		readonly level: number;
		readonly definition: { readonly name: string };
	}[];
}

export function sortDeviceDefinitions<T extends IPartialDeviceDefinition>(elements: readonly T[]) {
	function stringify(a: IPartialDeviceDefinition) {
		return JSON.stringify(
			[...a.definitions]
				// Sort definitions array by level to ensure that the parent is always before the child in the array
				.sort((a, b) => b.level - a.level)
				// Extract definition names from the sorted array
				// This results in an array (similar to pathFromTopLevelDevice) but for device definitions
				// (i.e. ["root", "analytics", "FTIR"] or ["root", "analytics", "MS"])
				.map((d) => d.definition.name)
			// Remove the first and last characters from the string representation of the array
			// because the square brackets lead to incorrect sorting
		).slice(1, -1);
	}

	return sortObjects(elements, stringify);
}
