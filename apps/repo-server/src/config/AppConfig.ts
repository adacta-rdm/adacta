import { LOG_LEVEL } from "~/lib/logger/Logger";
import { Service } from "~/lib/serviceContainer/ServiceContainer";
import { AuthURL } from "~/lib/url/AuthURL";
import { readEnvVar } from "~/lib/utils/readEnvVar";

/**
 * Top level configuration values for the repo server.
 */
@Service()
export class AppConfig {
	constructor(initializer: Partial<AppConfig> = {}) {
		this.port = initializer.port ?? parseInt(readEnvVar("REPO_SERVER_PORT", "5000"));

		if (this.port <= 0) {
			throw new Error(`Invalid port: ${this.port}`);
		}

		this.publicURL =
			initializer.publicURL ?? readEnvVar("REPO_SERVER_PUBLIC_URL", "http://localhost:5000");

		if (initializer.logLevel !== undefined) {
			this.logLevel = initializer.logLevel;
		} else {
			switch (readEnvVar("REPO_SERVER_LOG_LEVEL", "info").toLowerCase()) {
				case "trace":
					this.logLevel = LOG_LEVEL.TRACE;
					break;
				case "debug":
					this.logLevel = LOG_LEVEL.DEBUG;
					break;
				case "info":
					this.logLevel = LOG_LEVEL.INFO;
					break;
				case "warn":
					this.logLevel = LOG_LEVEL.WARN;
					break;
				case "error":
					this.logLevel = LOG_LEVEL.ERROR;
					break;
				case "fatal":
					this.logLevel = LOG_LEVEL.FATAL;
					break;
				case "silent":
					this.logLevel = LOG_LEVEL.SILENT;
					break;
				default:
					throw new Error(`Invalid log level: ${readEnvVar("REPO_SERVER_LOG_LEVEL", "info")}`);
			}
		}

		this.authServerHost =
			initializer.authServerHost ??
			readEnvVar("ADACTA_AUTH_SERVER_URL", "https://auth.adacta.host");

		this.authServerURL = new AuthURL(this.authServerHost);
	}

	/**
	 * The port on which the repo server should listen for requests. Note that this value is independent of the port
	 * on which the repo server is publicly accessible (see `publicURL`).
	 */
	port: number;

	/**
	 * From which this repo server instance is publicly accessible. This value is passed as-is as the first argument to
	 * the `RepoURL` constructor. See the `RepoURL` class for details on the exact format.
	 * @see RepoURL
	 * Examples:
	 *  - repo.adacta.host
	 *  - repo.adacta.host/staging
	 *  - http://localhost/staging
	 */
	publicURL: string;

	/**
	 * The log level to use for the repo server. Defaults to `info`.
	 *
	 * One of:
	 * - `trace`
	 * - `debug`
	 * - `info`
	 * - `warn`
	 * - `error`
	 * - `fatal`
	 * - `silent`
	 */
	logLevel: LOG_LEVEL;

	/**
	 * The host of the authentication server.
	 */
	authServerHost: string;

	/**
	 * Convenience method to get the various endpoints of the authentication server.
	 */
	authServerURL: AuthURL;
}
