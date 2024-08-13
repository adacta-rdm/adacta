import type { Meta } from "@storybook/react";

import type { ISpreadSheetRows } from "../components/spreadsheet/Spreadsheet";
import { Spreadsheet } from "../components/spreadsheet/Spreadsheet";

const meta = {
	title: "Spreadsheet",
	component: Spreadsheet,
} satisfies Meta<typeof Spreadsheet>;

export default meta;

const smallDataSet: ISpreadSheetRows = [];
for (let i = 0; i < 10; i++) {
	const row = [];
	for (let j = i * 10; j < i * 10 + 10; j++) {
		row.push({ value: String(j) });
	}
	smallDataSet.push(row);
}

const manyColumns = [[...Array(26 * 27 + 3).keys()].map((r) => ({ value: String(r) }))];

export const SpreadsheetArtificialHeaderRows = {
	args: {
		rows: smallDataSet,
		headerOptions: {
			artificialHeaderRows: true,
		},
	},
};

export const SpreadsheetArtificialHeaderColumns = {
	args: {
		rows: smallDataSet,
		headerOptions: {
			artificialHeaderColumns: true,
		},
	},
};

export const SpreadsheetArtificialHeaderMetadata = {
	args: {
		rows: smallDataSet,
		headerOptions: {
			artificialHeaderRows: true,
			artificialHeaderColumns: true,
			artificialHeadersColumnFirstRows: ["RowA", "RowB", "RowC"],
		},
	},
};

export const SpreadsheetDataHeader = {
	args: {
		rows: smallDataSet,
		headerOptions: {
			headerColumns: [0, 1],
			headerRows: [0, 1],
		},
	},
};

export const SpreadsheetNonConsecutiveDataHeader = {
	args: {
		rows: smallDataSet,
		headerOptions: {
			headerColumns: [0, 3],
			headerRows: [0, 4],
		},
	},
};

export const ManyColumns = {
	args: {
		headerOptions: {
			artificialHeaderRows: true,
		},
		rows: manyColumns,
	},
};

export const UnevenColumns = {
	args: {
		headerOptions: {
			artificialHeaderRows: true,
		},
		rows: [
			[0, 1, 2],
			[0, 0, 0, 0, 0, 0],
		].map((r) => r.map((v) => ({ value: String(v) }))),
	},
};
