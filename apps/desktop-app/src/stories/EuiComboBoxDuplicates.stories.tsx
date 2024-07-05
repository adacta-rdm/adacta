import type { Meta } from "@storybook/react";
import type { StoryObj } from "@storybook/react";
import { useState } from "react";

import { EuiComboBoxDuplicates } from "../components/nameComposition/EuiComboBoxDuplicates";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

export default {
	title: "Utils/EuiComboBoxDuplicates",
	component: EuiComboBoxDuplicatesWrapper,
} as Meta<typeof EuiComboBoxDuplicatesWrapper>;

type Story = StoryObj<typeof EuiComboBoxDuplicatesWrapper>;

function EuiComboBoxDuplicatesWrapper() {
	const options = [
		{ value: "foo", label: "Foo" },
		{ value: "bar", label: "Bar" },
		{ value: "baz", label: "Baz" },
	];

	const [selectedOptions, setSelectedOptions] = useState([]);

	const onChange = (o: any) => {
		setSelectedOptions(o);
	};

	return (
		<EuiComboBoxDuplicates
			selectedOptions={selectedOptions}
			onChange={onChange}
			options={options}
		/>
	);
}

export const Basic: Story = {
	args: {},
};
