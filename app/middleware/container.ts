import type { Route } from "~/.react-router/types/app/+types/root.ts";
import { services } from "~/app/.server/context.ts";
import { createAppContainer } from "~/app/.server/createAppContainer.ts";

const root = createAppContainer();

/**
 * Gives every request its own service container, cloned from the process-wide
 * one. Services resolved during a request are not shared with the next.
 */
export const container: Route.MiddlewareFunction = ({ context }, next) => {
	context.set(services, root.clone());
	return next();
};
