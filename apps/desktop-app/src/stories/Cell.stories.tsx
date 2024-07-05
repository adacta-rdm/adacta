import type { Meta, StoryObj } from "@storybook/react";
import type { ComponentProps } from "react";
import React from "react";

import { Cell } from "../components/spreadsheet/Cell";

/**
 * Helper that renders multiple cells
 */
const RenderMultipleCells = (props: { cells: ComponentProps<typeof Cell>[] }): JSX.Element => {
	return (
		<>
			{props.cells.map((c, i) => (
				<Cell key={i} {...c} />
			))}
		</>
	);
};

const getCellConfigs = (validation: ComponentProps<typeof Cell>["data"]["validation"]) => [
	{
		backgroundColor: "",
		clickable: false,
		data: { value: "Regular Cell", validation },
		headerCell: false,
		selected: false,
	},
	{
		backgroundColor: "",
		clickable: false,
		data: { value: "Selected Cell", validation },
		headerCell: false,
		selected: true,
	},
	{
		backgroundColor: "",
		clickable: true,
		data: { value: "Clickable Cell", validation },
		headerCell: false,
		selected: false,
	},
];

// More on how to set up stories at: https://storybook.js.org/docs/7.0/react/writing-stories/introduction
export default {
	title: "Spreadsheet/Cell",
	component: RenderMultipleCells,
	decorators: [],
} as Meta<typeof RenderMultipleCells>;

type Story = StoryObj<typeof RenderMultipleCells>;

export const NonValidatedCell: Story = {
	args: {
		cells: getCellConfigs(undefined),
	},
};

export const ValidCell: Story = {
	args: {
		cells: getCellConfigs("valid"),
	},
};

export const InvalidCell: Story = {
	args: {
		cells: getCellConfigs("invalid"),
	},
};
