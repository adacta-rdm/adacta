/**
 * Shared test-environment conventions.
 *
 * Setup functions operate on service containers and return only the configured
 * container. Tests construct their own inputs and resolve the services or data
 * they need from that container. Environment overrides are passed as raw values.
 *
 * The setups build on each other. They add an environment, isolated
 * persistence, a migrated schema, and a registered user.
 * Each step uses the same services the application uses. A test therefore
 * never restates what the application already does.
 */
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";

import { createLocalAppContainer } from "~/app/.server/appContainer.local.ts";
import { migrateSqliteDatabase } from "~/app/.server/migrateSqliteDatabase.ts";
import { sqliteDatabasePath } from "~/app/.server/sqliteDatabase.ts";
import { BetterAuth } from "~/app/services/BetterAuth.ts";
import { Security } from "~/app/services/Security.ts";
import { Env, type EnvSource } from "~/lib/env/Env.ts";
import { LOG_LEVEL, Logger } from "~/lib/logger/Logger.ts";
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
	return createLocalAppContainer(new Env({ ...env, ADACTA_LOG_LEVEL: "silent" }));
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
 * Creates an isolated application database with its schema and fixed lookup rows.
 */
export async function setupEmptyTestDatabaseEnvironment(
	env: EnvSource = {},
): Promise<ServiceContainer> {
	const container = setupTestPersistenceEnvironment(env);

	migrateSqliteDatabase(sqliteDatabasePath(container.get(Env)));

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
 * Return the names of every stored file, including staged files.
 */
export function storedFiles(scope: ServiceContainer): string[] {
	const directory = scope.get(Env).string("ADACTA_STORAGE_DIR");
	if (!existsSync(directory)) return [];

	return readdirSync(directory, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name);
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
