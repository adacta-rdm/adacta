/**
 * Starts the server for the browser tests. It loads the demo preset, builds
 * the app, and serves the build on E2E_PORT. The selected runtime keeps the
 * data apart from the development data. See runtimes/README.md.
 *
 *   bun run start:e2e
 */
import { e2eSettings } from "~runtime/e2eEnvironment.ts";

import { E2E_BASE_URL, E2E_PORT } from "~/e2e/settings.ts";
import { run } from "~/scripts/helpers/run.ts";

// A development user would skip the sign-in that the tests exercise.
delete process.env.ADACTA_DEV_USER;

// seed:load stops when NODE_ENV is production. Only the build and the server
// run with it.
delete process.env.NODE_ENV;

const env = {
	...e2eSettings,
	ADACTA_URL: E2E_BASE_URL,
	ADACTA_AUTH_SECRET: "adacta-e2e-secret-for-local-tests-only",
	ADACTA_LOG_LEVEL: "warn",
};

await run(["bun", "run", "seed:load", "demo"], env);

// The tests run against a production build. See the comment on webServer in
// playwright.config.ts.
const production = { ...env, NODE_ENV: "production" };
await run(["bun", "run", "build"], production);
await run(["bun", "run", "start"], { ...production, PORT: String(E2E_PORT) });
