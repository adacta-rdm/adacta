import type { Meta } from "@storybook/react";

import LoginPage from "../routes/login";

import type { AdactaStoryObj } from "~/.storybook/types";
import { HistoryService } from "~/apps/desktop-app/src/services/history/HistoryService";
import { GraphQLHeaderService } from "~/apps/desktop-app/src/services/repositoryId/GraphQLHeaderService";
import { RepoURL } from "~/lib/url/RepoURL";

const meta = {
	title: "Login",
	component: LoginPage,
} satisfies Meta<typeof LoginPage>;

export default meta;

type Story = AdactaStoryObj<typeof meta>;

export const Default: Story = {
	parameters: {
		services: [
			new GraphQLHeaderService(),
			new HistoryService(),
			new RepoURL("https://example.com"),
		],
		router: {
			location: ["/login"],
		},
	},
};
