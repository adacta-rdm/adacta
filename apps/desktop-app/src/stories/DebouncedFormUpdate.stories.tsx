import { EuiFieldText } from "@elastic/eui";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { useDebounceFormUpdate } from "~/apps/desktop-app/src/components/utils/useDebouncedFormUpdate";

export default {
	title: "Utils/DebouncedFormUpdate",
	component: DebounceConsumer,
} as Meta<typeof DebounceConsumer>;

type Story = StoryObj<typeof DebounceConsumer>;

export const Basic: Story = {
	args: {
		initialValue: "Foobar123",
	},
};

function DebounceConsumer(props: { initialValue: string }) {
	// This value will be updated using the updateFunction of useDebounceFormUpdate
	const [debouncedValue, setDebouncedValue] = useState(props.initialValue);

	// Actual value + onChange function with debouncing
	const [value, onChange] = useDebounceFormUpdate<string>(
		props.initialValue,
		setDebouncedValue,
		2000
	);

	return (
		<pre>
			Debounced Value: {debouncedValue}
			{"\n"}
			Value: {value}
			<EuiFieldText
				value={value}
				onChange={(e) => {
					onChange(e.target.value);
				}}
			/>
		</pre>
	);
}
