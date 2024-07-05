import { Service } from "~/lib/serviceContainer/ServiceContainer";
import { readEnvVar } from "~/lib/utils/readEnvVar";

/**
 * Configuration values for authentication. Used to sign and verify JWTs.
 */
@Service()
export class AuthConfig {
	constructor(initializer: Partial<AuthConfig> = {}) {
		this.privateKey = initializer.privateKey ?? readEnvVar("AUTH_SERVER_JWT_PRIVATE_KEY");
		this.publicKey = initializer.publicKey ?? readEnvVar("AUTH_SERVER_JWT_PUBLIC_KEY");
	}

	privateKey: string;
	publicKey: string;
}
