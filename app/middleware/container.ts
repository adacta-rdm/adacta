import type { Route } from "~/.react-router/types/app/+types/root.ts";
import { createAppContainer } from "~/app/.server/appContainer.ts";
import { services } from "~/app/.server/context.ts";

/**
 * Gives a request its service container.
 * An entry point may provide one before this middleware runs.
 * Otherwise this middleware creates a local container.
 */
export const container: Route.MiddlewareFunction = ({ context }, next) => {
	try {
		context.get(services);
	} catch {
		context.set(services, createAppContainer());
	}
	return next();
};
