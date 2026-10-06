import { defineConfig, devices } from "@playwright/test";

import { AUTH_STATE_PATH, E2E_BASE_URL } from "./e2e/settings.ts";

const isCI = Boolean(process.env.CI);

export default defineConfig({
	testDir: "./e2e",

	// The browser specs use a separate suffix, so Bun does not run them with
	// the unit and route tests.
	testMatch: /.*\.e2e\.ts$/,
	globalSetup: "./e2e/global-setup.ts",

	fullyParallel: true,
	forbidOnly: isCI,
	retries: 0,
	reporter: isCI
		? [["github"], ["html", { open: "never" }]]
		: [["list"], ["html", { open: "never" }]],

	timeout: 60_000,
	expect: { timeout: 10_000 },

	use: {
		baseURL: E2E_BASE_URL,
		storageState: AUTH_STATE_PATH,
		navigationTimeout: 30_000,

		// A failed test keeps the evidence needed to understand the browser state.
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},

	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

	// The tests run against a production build, locally and in CI. The
	// development server prepares a dependency for the browser when a page
	// first imports it. It then reloads every open page. Such a reload can
	// interrupt any step of a test. A build has no such step.
	webServer: {
		command: "bun run start:e2e",
		url: E2E_BASE_URL,
		reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
		timeout: 240_000,
		stdout: "pipe",
		stderr: "pipe",
	},
});
