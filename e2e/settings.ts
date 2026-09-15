import { fileURLToPath } from "node:url";

export const E2E_PORT = 5273;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/**
 * The browser state written by global setup. It contains the session cookie
 * for the seeded development user.
 */
export const AUTH_STATE_PATH = fileURLToPath(
	new URL("../.adacta/e2e/authenticated-user.json", import.meta.url),
);
