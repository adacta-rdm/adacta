import type { Meta } from "@storybook/react";
import type { StoryObj } from "@storybook/react";
import type { ComponentProps } from "react";
import { useState } from "react";

import { SearchableSelect } from "../components/utils/SearchableSelect";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

const SearchableSelectWrapper = <T,>(props: ComponentProps<typeof SearchableSelect<T>>) => {
	const [value, setValue] = useState<T | undefined>(undefined);

	return (
		<SearchableSelect options={props.options} value={value} onChangeValue={(v) => setValue(v)} />
	);
};

export default {
	title: "Utils/SearchableSelect",
	component: SearchableSelectWrapper,
} as Meta<typeof SearchableSelectWrapper>;

export type Story = StoryObj<typeof SearchableSelectWrapper>;

export const Basic: Story = {
	args: {
		options: [
			{ label: "Test1", value: 1 },
			{ label: "Test2", value: 2 },
			{ label: "Test1 ", value: 3 }, // Same label as first option but different value
		],
	},
};
