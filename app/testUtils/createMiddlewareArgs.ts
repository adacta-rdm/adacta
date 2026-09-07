/**
 * Builds the arguments for calling a middleware or a loader directly in a test,
 * without going through the router.
 *
 * The service container reaches the middleware through the router context. It
 * does so the same way it does at runtime. The shape matches React Router's own
 * DataFunctionArgs. The result can therefore be passed to anything the router
 * would call, including a route's typed middleware.
 *
 * `url` always follows the request. A test that depends on the path therefore
 * sets it in one place.
 */
import { mock } from "bun:test";

import { RouterContextProvider } from "react-router";

import { services } from "~/app/.server/context.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

const DEFAULT_URL = "http://localhost/";

type MiddlewareArgsOptions<Params extends Record<string, string>> = {
	/**
	 * The incoming request. Defaults to a plain GET without headers.
	 */
	request?: Request;

	/**
	 * Route parameters, for example `{ repo: "test" }`. Defaults to none.
	 */
	params?: Params;
};

export function createMiddlewareArgs<Params extends Record<string, string> = Record<string, never>>(
	container: ServiceContainer,
	options: MiddlewareArgsOptions<Params> = {},
) {
	const request = options.request ?? new Request(DEFAULT_URL);
	const params = options.params ?? ({} as Params);
	const context = new RouterContextProvider();
	context.set(services, container);

	return [
		{
			request,
			url: new URL(request.url),
			pattern: "",
			params,
			context,
		},
		mock(),
	] as const;
}
