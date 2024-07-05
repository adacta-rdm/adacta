import type { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";

import "@elastic/eui/dist/eui_theme_light.css";
import type { ISpreadSheetRows } from "../components/spreadsheet/Spreadsheet";
import { Spreadsheet } from "../components/spreadsheet/Spreadsheet";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

export default {
	title: "Spreadsheet",
	component: Spreadsheet,
} as ComponentMeta<typeof Spreadsheet>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Spreadsheet> = (args) => <Spreadsheet {...args} />;

const smallDataSet: ISpreadSheetRows = [];
for (let i = 0; i < 10; i++) {
	const row = [];
	for (let j = i * 10; j < i * 10 + 10; j++) {
		row.push({ value: String(j) });
	}
	smallDataSet.push(row);
}

//const row = ;
const manyColumns = [[...Array(26 * 27 + 3).keys()].map((r) => ({ value: String(r) }))];

export const SpreadsheetArtificialHeaderRows = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
SpreadsheetArtificialHeaderRows.args = {
	rows: smallDataSet,
	headerOptions: {
		artificialHeaderRows: true,
	},
};

export const SpreadsheetArtificialHeaderColumns = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
SpreadsheetArtificialHeaderColumns.args = {
	rows: smallDataSet,
	headerOptions: {
		artificialHeaderColumns: true,
	},
};

export const SpreadsheetArtificialHeaderMetadata = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
SpreadsheetArtificialHeaderMetadata.args = {
	rows: smallDataSet,
	headerOptions: {
		artificialHeaderRows: true,
		artificialHeaderColumns: true,
		artificialHeadersColumnFirstRows: ["RowA", "RowB", "RowC"],
	},
};

export const SpreadsheetDataHeader = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
SpreadsheetDataHeader.args = {
	rows: smallDataSet,
	headerOptions: {
		headerColumns: [0, 1],
		headerRows: [0, 1],
	},
};

export const SpreadsheetNonConsecutiveDataHeader = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
SpreadsheetNonConsecutiveDataHeader.args = {
	rows: smallDataSet,
	headerOptions: {
		headerColumns: [0, 3],
		headerRows: [0, 4],
	},
};

export const ManyColumns = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
ManyColumns.args = {
	headerOptions: {
		artificialHeaderRows: true,
	},
	rows: manyColumns,
};

export const UnevenColumns = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
UnevenColumns.args = {
	headerOptions: {
		artificialHeaderRows: true,
	},
	rows: [
		[0, 1, 2],
		[0, 0, 0, 0, 0, 0],
	].map((r) => r.map((v) => ({ value: String(v) }))),
};
