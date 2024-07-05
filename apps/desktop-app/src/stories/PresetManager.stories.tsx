import type { Meta, StoryObj } from "@storybook/react";
import React, { Suspense } from "react";

import { PresetManager } from "../components/importWizzard/preset/PresetManager";

import { RelayMockedDataProvider } from "~/.storybook/helpers/RelayMockedDataProvider";
import { getSeededRandomInt } from "~/.storybook/helpers/seededRandomUtils";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export

export default {
	title: "Utils/PresetManager",
	component: FreeComponentSelectionWrapper,
} as Meta<typeof FreeComponentSelectionWrapper>;

type Story = StoryObj<typeof FreeComponentSelectionWrapper>;

function FreeComponentSelectionWrapper() {
	return (
		<RelayMockedDataProvider
			mockResolvers={{
				ResourceConnection: () => ({ edges: new Array(5).fill(undefined) }),
				ImportPreset: () => ({
					columns: new Array(getSeededRandomInt(20, 50))
						.fill(undefined)
						.map((_, i) => `Column ${i}`),
				}),
			}}
		>
			<Suspense fallback={<>Suspended</>}>
				<PresetManager openerPresetConnectionId={"123"} onClose={() => {}} />
			</Suspense>
		</RelayMockedDataProvider>
	);
}

export const Basic: Story = {
	args: {},
};
