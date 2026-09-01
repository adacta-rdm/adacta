import { createContext, type RouterContext } from "react-router";

import type { ServiceContainer } from "~/lib/service-container/ServiceContainer";

/**
 * The service container scoped to the current request. Root middleware provides
 * it by cloning the process-wide container. This context intentionally has no
 * default: omitting that middleware fails immediately instead of silently using
 * process-global state.
 */
export const services: RouterContext<ServiceContainer> = createContext();
