import type { Route } from "~/.react-router/types/app/+types/root";
import { services } from "~/app/.server/context";
import { createAppContainer } from "~/app/.server/createAppContainer";

const root = createAppContainer();

/**
 * Gives every request its own service container, cloned from the process-wide
 * one. Services resolved during a request are not shared with the next.
 */
export const container: Route.MiddlewareFunction = ({ context }, next) => {
	context.set(services, root.clone());
	return next();
};
