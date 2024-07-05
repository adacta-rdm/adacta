import lodash from "lodash";

import { CSVImportWizard } from "./CSVImportWizard";

export function compositeHeaderAutomatic(rows: string[][]): string[][] {
	rows = rows.map((r) => r.map((c) => CSVImportWizard.cleanInput(c)));

	// Remove last header element if it is empty for all headers
	// Otherwise this function would 'make up' an additional header
	const lastElements = rows.map((r) => r[r.length - 1]);
	if (lastElements.every((e) => e === "")) {
		rows = rows.map((r) => r.slice(0, -1));
	}

	// Identify indices of populated columns for each row
	// The order is reversed so the indices for each row are ordered from high to low.
	// The reversed order makes it easier to find the next smaller index whose column
	// is populated for a given index
	const populatedColumns = rows.map((r) => {
		const a = r.flatMap((c, index) => {
			if (c.trim() !== "") {
				return index;
			}
			return [];
		});
		a.reverse();
		return a;
	});

	// To find the column captions for a given index n we simply need to do the following for
	// every row
	//      - If the column value at the index n is populated
	//          => use that value
	//
	//      - If the column value at the index n is not populated
	//          => find the next smaller index with a populated index
	const findColumnNameByIndex = (index: number) => {
		const headerColumns = populatedColumns.map((columnIndexArray) =>
			columnIndexArray.find((columnIndex) => columnIndex <= index)
		);

		// If the first row has no information we assume that the composite naming schema has not
		// yet started. Try to return the last row
		if (headerColumns[0] === undefined) {
			const lastColumn = headerColumns[headerColumns.length - 1];
			if (lastColumn !== undefined) {
				return [rows[rows.length - 1][lastColumn]];
			}
		}

		// If the header columns array isn't sorted we can assume that we are outside the
		// composite naming schema. It would not make sense to select the 5 element from the first
		// header row and the 3 element from the second row.
		if (
			!lodash.isEqual(
				headerColumns,
				[...headerColumns].sort((a, b) => (a ?? 0) - (b ?? 0))
			)
		) {
			// Note: The solution to simply select the element from the first line is probably a bit
			// arbitrary, but I can't think of anything better for now and it should work for
			// Mariam's sample data
			return [rows[0][index]];
		}

		return headerColumns.flatMap((columnIndex, rowIndex) => {
			if (columnIndex == undefined) {
				return [];
			}
			return rows[rowIndex][columnIndex];
		});
	};

	return rows[0].map((_, index) => findColumnNameByIndex(index));
}
