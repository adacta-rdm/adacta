import { Service } from "~/lib/serviceContainer/ServiceContainer";
import { readEnvVar } from "~/lib/utils/readEnvVar";

/**
 * Configuration values that control how the remote services are accessed (via HTTP).
 */
@Service()
export class RemoteServicesConfig {
	constructor(initializer: Partial<RemoteServicesConfig> = {}) {
		this.baseURL = initializer.baseURL ?? new URL(readEnvVar("SERVICES_URL"));
	}

	/**
	 * The base URL of the services ending with a slash.
	 *
	 * Specific endpoints can be accessed by appending the endpoint to this URL.
	 */
	baseURL: URL;
}
