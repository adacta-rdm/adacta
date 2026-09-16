import { createContext, type RouterContext } from "react-router";

import type { ServiceContainer } from "~/lib/service-container/ServiceContainer";

/**
 * The service container for one request.
 * An entry point can set it before routing begins.
 * The root middleware creates a local container when no entry point has set one.
 * The context has no default value.
 * Reading an unset context throws.
 */
export const services: RouterContext<ServiceContainer> = createContext();
