import { ServiceContainer } from "~/lib/serviceContainer/ServiceContainer";
import { Env } from "~/lib/utils/Env";

/**
 * The process-wide container. Request scopes are clones of it. A service
 * resolved during one request is therefore not shared with the next.
 *
 * Environment values are read once, here, and injected as a service. Nothing
 * below this point reads process.env directly. Services can therefore be
 * tested with a fabricated environment.
 */
export function createAppContainer(env = new Env()): ServiceContainer {
	const container = new ServiceContainer();
	container.set(env);
	return container;
}

const root = createAppContainer();

export function createRequestContainer(): ServiceContainer {
	return root.clone();
}
