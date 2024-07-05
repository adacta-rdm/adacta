import { Service } from "~/lib/serviceContainer/ServiceContainer";
import { readEnvVar } from "~/lib/utils/readEnvVar";

@Service()
export class PostgresConfig {
	constructor(initializer: Partial<PostgresConfig> = {}) {
		this.host = initializer.host ?? readEnvVar("POSTGRES_HOST", "localhost");
		this.port = initializer.port ?? parseInt(readEnvVar("POSTGRES_PORT", "5432"));
		this.user = initializer.user ?? readEnvVar("POSTGRES_USER", "postgres");
		this.password = initializer.password ?? readEnvVar("POSTGRES_PASSWORD");
		this.dbName = initializer.dbName ?? readEnvVar("POSTGRES_DB");
		this.ca = initializer.ca ?? readEnvVar("POSTGRES_CA", "");

		if (this.port <= 0) {
			throw new Error(`Invalid port: ${this.port}`);
		}
	}

	host: string;

	port: number;

	user: string;

	password: string;

	dbName: string;

	ca: string;

	toString() {
		// https://www.postgresql.org/docs/16/libpq-connect.html#LIBPQ-CONNSTRING
		const url = new URL(
			`postgres://${this.user}:${this.password}@${this.host}:${this.port}/${this.dbName}`
		);
		// url.searchParams.append("sslmode", "require");
		// url.searchParams.append("sslrootcert", this.ca);
		return url.toString();
	}
}
