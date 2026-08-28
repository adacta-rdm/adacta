import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { services } from "~/app/context";
import { BetterAuth } from "~/app/services/BetterAuth";

/**
 * Catch-all resource route for Better Auth's HTTP API under `/api/auth/*`.
 *
 * React Router sends GET to `loader` and every other method to `action`. Both
 * hand the request to Better Auth's handler. That handler resolves the specific
 * endpoint. The `$` segment is the splat that keeps all of them behind one
 * route.
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
	return context.get(services).get(BetterAuth).handler(request);
}

export async function action({ request, context }: ActionFunctionArgs) {
	return context.get(services).get(BetterAuth).handler(request);
}
