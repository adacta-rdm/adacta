import type { Route } from "~/.react-router/types/app/+types/root.ts";
import { createAppContainer } from "~/app/.server/appContainer.ts";
import { services } from "~/app/.server/context.ts";

/**
 * Gives every request its own service container. Services resolved during a
 * request are therefore not shared with the next request.
 */
export const container: Route.MiddlewareFunction = ({ context }, next) => {
	context.set(services, createAppContainer());
	return next();
};
