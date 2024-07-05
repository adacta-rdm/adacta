import type { Meta, StoryObj } from "@storybook/react";
import React, { Suspense } from "react";

import { FreeComponentSelection } from "../components/device/FreeComponentSelection";

import { RelayMockedDataProvider } from "~/.storybook/helpers/RelayMockedDataProvider";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

export default {
	title: "Utils/FreeComponentSelection",
	component: FreeComponentSelectionWrapper,
} as Meta<typeof FreeComponentSelectionWrapper>;

type Story = StoryObj<typeof FreeComponentSelectionWrapper>;

function FreeComponentSelectionWrapper() {
	return (
		<RelayMockedDataProvider>
			<Suspense fallback={<>Suspended</>}>
				<FreeComponentSelection
					deviceId={"123"}
					begin={new Date()}
					valueOfSelected={"123"}
					onChange={() => {}}
				/>
			</Suspense>
		</RelayMockedDataProvider>
	);
}

export const Basic: Story = {
	args: {},
};
