import { services } from "~/app/context";
import { createRequestContainer } from "~/app/createAppContainer.server";

import type { Route } from "./+types/root";

/**
 * Gives every request its own service container, cloned from the process-wide
 * one. Services resolved during a request are not shared with the next.
 */
export const serviceContainerMiddleware: Route.MiddlewareFunction = ({ context }, next) => {
	context.set(services, createRequestContainer());
	return next();
};
