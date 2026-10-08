import { createContext, type RouterContext } from "react-router";

import type { ServiceContainer } from "~/lib/service-container/ServiceContainer";

/**
 * The service container for one request. The root middleware sets it before
 * any loader or action runs. The context has no default value. Reading it
 * before the middleware has run therefore throws.
 */
export const services: RouterContext<ServiceContainer> = createContext();
