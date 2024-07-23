import type { Meta } from "@storybook/react";
import type { StoryObj } from "@storybook/react";

import { EuiComboBoxDuplicates } from "../components/nameComposition/EuiComboBoxDuplicates";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
	title: "Utils/EuiComboBoxDuplicates",
	component: EuiComboBoxDuplicates,
} satisfies Meta<typeof EuiComboBoxDuplicates>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
	args: {
		selectedOptions: [{ value: "foo", label: "Foo" }],
		options: [
			{ value: "foo", label: "Foo" },
			{ value: "bar", label: "Bar" },
			{ value: "baz", label: "Baz" },
		],
		onChange: () => {},
	},
};
