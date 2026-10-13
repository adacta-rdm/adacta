/**
 * Shared test-environment conventions.
 *
 * Setup functions operate on service containers and return only the configured
 * container. Tests construct their own inputs and resolve the services or data
 * they need from that container. Environment overrides are passed as raw values.
 *
 * The setups build on each other. They add an environment with an empty
 * database and empty file storage, the migrated schema, a registered user, and
 * a request scope. The selected runtime provides the first two steps. See
 * runtimes/README.md. Each step uses the same services the application uses.
 * A test therefore never restates what the application already does.
 */
import { Writable } from "node:stream";

import { createTestAppContainer, migrateTestDatabase } from "~runtime/testEnvironment.ts";

import { BetterAuth } from "~/app/services/BetterAuth.ts";
import { Security } from "~/app/services/Security.ts";
import type { EnvSource } from "~/lib/env/Env.ts";
import { LOG_LEVEL, Logger } from "~/lib/logger/Logger.ts";
import { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

export { storedFiles } from "~runtime/testEnvironment.ts";

export const TEST_USER = {
	name: "Test User",
	email: "test.user@example.com",
	password: "test-password",
} as const;

/**
 * Creates an environment with an empty database and empty file storage. No
 * migrations have run.
 */
export function setupTestEnvironment(env: EnvSource = {}): ServiceContainer {
	return createTestAppContainer(env);
}

/**
 * Creates an isolated application database with its schema and fixed lookup rows.
 */
export async function setupEmptyTestDatabaseEnvironment(
	env: EnvSource = {},
): Promise<ServiceContainer> {
	const container = setupTestEnvironment(env);

	await migrateTestDatabase(container);

	return container;
}

/**
 * Create a database environment containing one user registered through the
 * production authentication service. That user is set as the current identity.
 */
export async function setupTestUserEnvironment(env: EnvSource = {}): Promise<ServiceContainer> {
	const container = await setupEmptyTestDatabaseEnvironment(env);

	container.get(Security).setCurrentUserId(await signUpTestUser(container));

	return container;
}

/**
 * Returns a request scope cloned from an isolated environment with one registered user.
 */
export async function setupTestRequestScope(env: EnvSource = {}): Promise<ServiceContainer> {
	return (await setupTestUserEnvironment(env)).clone();
}

type TestUserOverrides = { name?: string; email?: string; password?: string };

/**
 * Sign a user in and return the value for a request's Cookie header. A test can
 * then make a request that carries a real session.
 *
 * Only the name=value part of each cookie is kept. The attributes a server
 * sends back (Path, HttpOnly) do not belong in a request header.
 */
export async function signInTestUser(
	container: ServiceContainer,
	overrides: TestUserOverrides = {},
): Promise<string> {
	const { email, password } = { ...TEST_USER, ...overrides };

	const response = await container.get(BetterAuth).api.signInEmail({
		body: { email, password },
		asResponse: true,
	});

	return response.headers
		.getSetCookie()
		.map((cookie) => cookie.split(";", 1)[0])
		.join("; ");
}

/**
 * Register a user through Better Auth and return the new user id.
 */
export async function signUpTestUser(
	container: ServiceContainer,
	overrides: TestUserOverrides = {},
): Promise<string> {
	const { name, email, password } = { ...TEST_USER, ...overrides };

	const { user } = await container.get(BetterAuth).api.signUpEmail({
		body: { name, email, password },
	});

	return user.id;
}

/**
 * Capture error log lines from a request scope for assertions.
 */
export function captureTestLogs(scope: ServiceContainer): string[] {
	const lines: string[] = [];
	const stream = new Writable({
		write(chunk, _encoding, done) {
			lines.push(String(chunk).trimEnd());
			done();
		},
	});
	scope.set(new Logger({ level: LOG_LEVEL.ERROR, stream }));

	return lines;
}
