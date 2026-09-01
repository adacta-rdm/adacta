/**
 * Shared test-environment conventions.
 *
 * Setup functions operate on service containers and return only the configured
 * container. Tests construct their own inputs and resolve the services or data
 * they need from that container. Environment overrides are passed as raw values.
 *
 * The setups build on each other: an environment, then databases, then a
 * migrated schema, then a registered user. Each step uses the same services the
 * application uses, so a test never restates what the application already does.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BetterAuth } from "~/app/services/BetterAuth";
import { RepoManager } from "~/app/services/RepoManager";
import { Security } from "~/app/services/Security";
import { Env, type EnvSource } from "~/lib/env/Env";
import { SilentLogger } from "~/lib/logger/SilentLogger";
import { ServiceContainer } from "~/lib/service-container/ServiceContainer";

export const TEST_USER = {
	name: "Test User",
	email: "test.user@example.com",
	password: "test-password",
} as const;

/**
 * Create the root service-container environment shared by more specialized test fixtures.
 */
export function setupTestEnvironment(env: EnvSource = {}): ServiceContainer {
	const container = new ServiceContainer();
	container.set(new Env(env));
	container.set(new SilentLogger());
	return container;
}

/**
 * Create an environment whose databases live in a fresh temporary directory, so
 * one test never sees another's data. No migrations have run yet.
 *
 * The directory is left behind on purpose. It costs nothing, and it means the
 * SQLite file of a failing test can still be opened afterwards.
 */
export function setupTestDatabaseEnvironment(env: EnvSource = {}): ServiceContainer {
	const dbDir = mkdtempSync(join(tmpdir(), "adacta-test-"));

	return setupTestEnvironment({ ADACTA_DB_DIR: dbDir, ...env });
}

/**
 * Create an environment with a migrated system database and no data in it.
 */
export function setupEmptyTestDatabaseEnvironment(env: EnvSource = {}): ServiceContainer {
	const container = setupTestDatabaseEnvironment(env);

	container.get(RepoManager).migrateAll();

	return container;
}

/**
 * Create a database environment containing one user registered through the
 * production authentication service. That user is set as the current identity.
 */
export async function setupTestUserEnvironment(env: EnvSource = {}): Promise<ServiceContainer> {
	const container = setupEmptyTestDatabaseEnvironment(env);

	container.get(Security).setCurrentUserId(await signUpTestUser(container));

	return container;
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
