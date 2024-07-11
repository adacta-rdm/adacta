import "../apps/desktop-app/src/euiIcons";
import "@elastic/eui/dist/eui_theme_light.css";
import "@elastic/charts/dist/theme_light.css";
import { EuiProvider } from "@elastic/eui";
import type { ElementType } from "react";
import { RelayEnvironmentProvider } from "react-relay";
import { createMockEnvironment } from "relay-test-utils";
import "~/apps/desktop-app/src/tailwind-output.css";

export const parameters = {
	actions: { argTypesRegex: "^on[A-Z].*" },
	controls: {
		matchers: {
			color: /(background|color)$/i,
			date: /Date$/,
		},
	},
};

//(relay as Writable<typeof relay>).useFragment = useFragment;
//(relay as Writable<typeof relay>).useLazyLoadQuery = useLazyLoadQuery;

const relayEnvironment = createMockEnvironment();

export const decorators = [
	(Story: ElementType) => (
		<RelayEnvironmentProvider environment={relayEnvironment}>
			<EuiProvider colorMode="light">
				<Story />
			</EuiProvider>
		</RelayEnvironmentProvider>
	),
];
