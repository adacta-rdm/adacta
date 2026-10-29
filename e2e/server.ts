/**
 * Starts the server for the browser tests. It loads the demo preset, builds
 * the app, and serves the build on E2E_PORT. The selected runtime keeps the
 * data apart from the development data. See runtimes/README.md.
 *
 *   bun run start:e2e
 */
import { e2eEnvironment } from "~runtime/e2eEnvironment.ts";

import { MAIL_SMTP_PORT, startMailServer } from "~/e2e/mail-server.ts";
import { E2E_BASE_URL, E2E_PORT } from "~/e2e/settings.ts";
import { Env } from "~/lib/env/Env.ts";
import { run } from "~/scripts/helpers/run.ts";

const env = new Env({
	...e2eEnvironment.settings,
	ADACTA_URL: E2E_BASE_URL,
	ADACTA_AUTH_SECRET: "adacta-e2e-secret-for-local-tests-only",
	ADACTA_LOG_LEVEL: "warn",
	PORT: String(E2E_PORT),
	ADACTA_SMTP_HOST: "127.0.0.1",
	ADACTA_SMTP_PORT: String(MAIL_SMTP_PORT),
	ADACTA_SMTP_REQUIRE_TLS: "false",
	ADACTA_MAIL_FROM: "Adacta <noreply@adacta.test>",
});

const mail = startMailServer();

await run(["bun", "run", "seed:load", "demo"], env);

// The tests run against a production build. See the comment on webServer in
// playwright.config.ts.
await run(["bun", "run", "build"], new Env({ ...env.values, NODE_ENV: "production" }));
try {
	await run(["bun", "run", "start"], env);
} finally {
	mail.stop();
}
