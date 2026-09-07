/**
 * Shared test-environment conventions.
 *
 * Setup functions operate on service containers and return only the configured
 * container. Tests construct their own inputs and resolve the services or data
 * they need from that container. Environment overrides are passed as raw values.
 *
 * The setups build on each other. They add an environment, isolated
 * persistence, a migrated schema, a registered user, and a bound repository.
 * Each step uses the same services the application uses. A test therefore
 * never restates what the application already does.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createAppContainer } from "~/app/.server/createAppContainer.ts";
import { BetterAuth } from "~/app/services/BetterAuth.ts";
import { RepoAccess } from "~/app/services/RepoAccess.ts";
import { RepoManager } from "~/app/services/RepoManager.ts";
import { Security } from "~/app/services/Security.ts";
import { Env, type EnvSource } from "~/lib/env/Env.ts";
import { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

export const TEST_USER = {
	name: "Test User",
	email: "test.user@example.com",
	password: "test-password",
} as const;

/**
 * Create the root service-container environment shared by more specialized test fixtures.
 */
export function setupTestEnvironment(env: EnvSource = {}): ServiceContainer {
	return createAppContainer(new Env({ ...env, ADACTA_LOG_LEVEL: "silent" }));
}

/**
 * Create an environment whose databases and stored files live in a fresh
 * temporary directory. No migrations have run yet.
 */
export function setupTestPersistenceEnvironment(env: EnvSource = {}): ServiceContainer {
	const tmpDir = mkdtempSync(join(tmpdir(), "adacta-test-"));

	return setupTestEnvironment({
		ADACTA_DB_DIR: join(tmpDir, "db"),
		ADACTA_STORAGE_DIR: join(tmpDir, "storage"),
		...env,
	});
}

/**
 * Create an environment with a migrated system database and no data in it.
 */
export function setupEmptyTestDatabaseEnvironment(env: EnvSource = {}): ServiceContainer {
	const container = setupTestPersistenceEnvironment(env);

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

/**
 * Create a user environment with one repository and return a scope bound to it.
 */
export async function setupTestRepositoryEnvironment(
	repository = "test",
	env: EnvSource = {},
): Promise<ServiceContainer> {
	const container = await setupTestUserEnvironment(env);
	const userId = container.get(Security).userId;
	const repositories = container.get(RepoManager);

	repositories.createRepository(repository);
	repositories.grantAccess(userId, repository);

	const scope = container.clone();
	scope.get(RepoAccess).selectRepository(repository);
	return scope;
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
