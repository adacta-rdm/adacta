import { createAuthClient } from "better-auth/react";

/**
 * Talks to the /api/auth routes from the browser.
 */
export const authClient = createAuthClient();
