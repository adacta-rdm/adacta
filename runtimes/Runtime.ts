/**
 * What a runtime provides. The type SelectedRuntime at the end checks the
 * runtime that the alias ~runtime selects. A runtime that lacks an export
 * therefore fails the type check. See README.md.
 */
import type * as appContainer from "~runtime/appContainer.ts";
import type * as cli from "~runtime/cli.ts";
import type * as e2eEnvironment from "~runtime/e2eEnvironment.ts";
import type * as testEnvironment from "~runtime/testEnvironment.ts";

import type { EnvSource } from "~/lib/env/Env.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

/**
 * Returns the type of a module when it provides every export of the contract,
 * and fails the type check otherwise. For example,
 * `Implements<typeof appContainer, AppContainerModule>` fails when
 * appContainer.ts lacks createAppContainer. The check exists only for
 * TypeScript. It leaves no code in the module.
 */
export type Implements<Module extends Contract, Contract> = Module;

/**
 * The module appContainer.ts of a runtime. It builds the root container of
 * the app from the runtime's database, file storage and settings.
 */
export type AppContainerModule = {
	createAppContainer(): ServiceContainer;
};

/**
 * The module cli.ts of a runtime. It exports the operations as one object.
 */
export type CliModule = {
	cli: Cli;
};

/**
 * The operations of a runtime. Each operation carries out one package script
 * after its arguments have been checked. For example, `seed:load pilot` calls
 * seedLoad("pilot").
 */
export type Cli = {
	/**
	 * Deletes the data of the development environment, applies the
	 * migrations, and loads a preset, defaulting to demo.
	 */
	seedLoad(preset: string | undefined): Promise<void>;

	/**
	 * Applies pending migrations and keeps the data.
	 */
	migrationsApply(): Promise<void>;

	/**
	 * Generates the route types, the runtime validators, and what else the
	 * runtime needs before a type check or a build.
	 */
	generate(): Promise<void>;

	/**
	 * Applies pending migrations and starts the development server.
	 */
	dev(args: string[]): Promise<void>;

	/**
	 * Builds the app for deployment.
	 */
	build(): Promise<void>;

	/**
	 * Applies pending migrations and serves a build.
	 */
	start(): Promise<void>;

	/**
	 * Runs the test suite.
	 */
	test(args: string[]): Promise<void>;
};

/**
 * The module testEnvironment.ts of a runtime. The shared test utilities in
 * app/testUtils/ build every test on it. A test therefore runs against the
 * database and the file storage of the selected runtime.
 */
export type TestEnvironmentModule = {
	/**
	 * Creates a root container with the supplied settings. Its database and
	 * file storage start empty, and no migrations have run. Two containers
	 * never share rows or files. For example, a test of a service that needs
	 * no tables starts here.
	 */
	createTestAppContainer(env?: EnvSource): ServiceContainer;

	/**
	 * Applies the migrations to the database of a container from
	 * createTestAppContainer().
	 */
	migrateTestDatabase(container: ServiceContainer): Promise<void>;

	/**
	 * Returns the names of every stored file, including staged files.
	 */
	storedFiles(scope: ServiceContainer): Promise<string[]>;
};

/**
 * The module e2eEnvironment.ts of a runtime. e2e/server.ts starts the server
 * for the browser tests with these settings.
 */
export type E2eEnvironmentModule = {
	/**
	 * Settings that keep the data of the browser tests apart from the data of
	 * the development server. A browser test run can therefore delete its data
	 * without changing the development data.
	 */
	e2eSettings: Record<string, string>;
};

/**
 * Checks the modules of the selected runtime against the types above. A
 * missing export or a different signature fails the type check here. The
 * check holds only types. It therefore leaves no code in the runtime.
 */
export type SelectedRuntime = [
	Implements<typeof appContainer, AppContainerModule>,
	Implements<typeof cli, CliModule>,
	Implements<typeof e2eEnvironment, E2eEnvironmentModule>,
	Implements<typeof testEnvironment, TestEnvironmentModule>,
];
