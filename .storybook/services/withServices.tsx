import { makeDecorator } from "@storybook/preview-api";
import type { ReactNode } from "react";

import { ServiceContainer } from "~/apps/desktop-app/src/services/ServiceContainer";
import { Service } from "~/apps/desktop-app/src/services/ServiceProvider";

export type WithServicesParameters = object[];

export const withServices = makeDecorator({
	name: "withServices",
	parameterName: "services",

	// This decorator will only come into effect if the "services" parameter is set
	skipIfNoParametersOrOptions: true,
	wrapper: (getStory, context, settings) => {
		const parameters = settings.parameters as WithServicesParameters;

		const serviceContainer = new ServiceContainer(
			Object.fromEntries(parameters.map((instance) => [instance.constructor.name, instance]))
		);

		return (
			<Service.Provider value={serviceContainer}>{getStory(context) as ReactNode}</Service.Provider>
		);
	},
});
