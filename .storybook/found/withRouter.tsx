import { makeDecorator } from "@storybook/preview-api";
import { MemoryProtocol } from "farce";
import { createFarceRouter, resolver } from "found";
import type { JSX } from "react";

import { routes } from "@/routes";
import type { RouterArgs } from "@/routes";
import { resolveLocation } from "~/apps/desktop-app/src/utils/resolveLocation";

export interface IWithRouterParameters {
	/**
	 *
	 */
	location: RouterArgs;
}

export const withRouter = makeDecorator({
	name: "withRouter",
	parameterName: "router",

	// This decorator will only come into effect if the "router" parameter is set
	skipIfNoParametersOrOptions: true,
	wrapper: (getStory, context, settings) => {
		const parameters = settings.parameters as IWithRouterParameters;

		const Router = createFarceRouter({
			historyProtocol: new MemoryProtocol(resolveLocation(...parameters.location)),
			// Set each configured route to the story. This effectively disables navigation away from
			// the story.
			routeConfig: routes.map((path) => ({
				path,
				Component: () => getStory(context) as JSX.Element,
			})),
		});

		return <Router resolver={resolver} />;
	},
});
