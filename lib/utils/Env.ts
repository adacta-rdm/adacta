/**
 * Reads environment values as strings, numbers, booleans, or URLs.
 */
export type EnvSource = Record<string, string | undefined>;

export class Env {
	readonly values: EnvSource;
	readonly environment: string;

	constructor(
		values: EnvSource = process.env,
		environment = values.APP_ENV ?? process.env.APP_ENV ?? "dev",
	) {
		this.values = values;
		this.environment = environment;
	}

	/**
	 * Copies the values and `APP_ENV` to an object.
	 *
	 * Existing values are kept unless `overrideExisting` is `true`.
	 *
	 * ```ts
	 * env.populate(); // copy to process.env
	 * env.populate(target, true); // replace values in target
	 * ```
	 */
	populate(target: EnvSource = process.env, overrideExisting = false): void {
		const values = { ...this.values, APP_ENV: this.environment };

		for (const [name, value] of Object.entries(values)) {
			if (overrideExisting || target[name] === undefined) target[name] = value;
		}
	}

	isDevelopment(): boolean {
		const env = this.environment.trim().toLowerCase();
		return env === "dev" || env === "development";
	}

	isProduction(): boolean {
		const env = this.environment.trim().toLowerCase();
		return env === "prod" || env === "production";
	}

	string(name: string): string;
	string(name: string, defaultValue?: string): string;
	string(name: string, defaultValue?: undefined): string | undefined;
	string(name: string, defaultValue?: string): string | undefined {
		const value = this.values[name];

		if (value?.trim()) {
			return value.replace(/\\n/g, "\n");
		}

		if (arguments.length > 1) return defaultValue;

		throw new MissingEnvError(name);
	}

	int(name: string): number;
	int(name: string, defaultValue: number): number;
	int(name: string, defaultValue: number | undefined): number | undefined;
	int(name: string, defaultValue?: number): number | undefined {
		const raw =
			arguments.length > 1 ? this.string(name, defaultValue?.toString()) : this.string(name);
		if (raw === undefined) return undefined;

		const value = Number(raw);
		if (!Number.isInteger(value)) {
			throw new InvalidEnvTypeError(name, "integer");
		}

		return value;
	}

	number(name: string): number;
	number(name: string, defaultValue: number): number;
	number(name: string, defaultValue: number | undefined): number | undefined;
	number(name: string, defaultValue?: number): number | undefined {
		const raw =
			arguments.length > 1 ? this.string(name, defaultValue?.toString()) : this.string(name);
		if (raw === undefined) return undefined;

		const value = Number(raw);
		if (!Number.isFinite(value)) {
			throw new InvalidEnvTypeError(name, "number");
		}

		return value;
	}

	boolean(name: string): boolean;
	boolean(name: string, defaultValue: boolean): boolean;
	boolean(name: string, defaultValue: boolean | undefined): boolean | undefined;
	boolean(name: string, defaultValue?: boolean): boolean | undefined {
		const raw =
			arguments.length > 1 ? this.string(name, defaultValue?.toString()) : this.string(name);
		if (raw === undefined) return undefined;

		const value = raw.trim().toLowerCase();
		if (["1", "true", "yes", "on"].includes(value)) return true;
		if (["0", "false", "no", "off"].includes(value)) return false;

		throw new InvalidEnvTypeError(name, "boolean");
	}

	url(name: string): URL;
	url(name: string, defaultValue: string | URL): URL;
	url(name: string, defaultValue: string | URL | undefined): URL | undefined;
	url(name: string, defaultValue?: string | URL): URL | undefined {
		const raw =
			arguments.length > 1 ? this.string(name, defaultValue?.toString()) : this.string(name);

		if (raw === undefined) return undefined;

		try {
			return new URL(raw);
		} catch {
			throw new InvalidEnvTypeError(name, "URL");
		}
	}
}

/**
 * A required environment variable is absent or empty.
 */
export class MissingEnvError extends Error {
	constructor(name: string) {
		super(`Required environment variable "${name}" is not defined or empty.`);
		this.name = "MissingEnvError";
	}
}

/**
 * An environment variable cannot be parsed as the requested type.
 */
export class InvalidEnvTypeError extends TypeError {
	constructor(name: string, expectedType: "integer" | "number" | "boolean" | "URL") {
		const article = expectedType === "integer" ? "an" : "a";
		super(`Environment variable "${name}" must be ${article} ${expectedType}.`);
		this.name = "InvalidEnvTypeError";
	}
}
