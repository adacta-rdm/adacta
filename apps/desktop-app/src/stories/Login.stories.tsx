import type { Meta, StoryObj } from "@storybook/react";

import LoginPage from "../routes/login";

export default {
	title: "Login",
	component: LoginPage,
} as Meta<typeof LoginPage>;

type Story = StoryObj<typeof LoginPage>;

export const Default: Story = {};
