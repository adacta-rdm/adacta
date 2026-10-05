/**
 * Call routes with a request scope and report their data, status, and redirect.
 * Returned and thrown responses use the same result shape.
 */
import { type UNSAFE_DataWithResponseInit } from "react-router";

import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

type Handler = (args: never) => unknown;
type RouteModule = { loader?: Handler; action?: Handler };
type RouteData<T> = T extends Response
	? never
	: T extends UNSAFE_DataWithResponseInit<infer Data>
		? Data
		: T;
type Result<T> = {
	status: number;
	data: RouteData<T> | undefined;
	location: string | null;
	response: Response | undefined;
};
type RequestOptions = { query?: Record<string, string> };
type ActionOptions = RequestOptions & { files?: readonly File[] };

/**
 * Call a route with a request scope and report its data, status, and redirect.
 * For example, a thrown 404 response returns status 404.
 */
export function testRoute<Module extends RouteModule>(
	scope: ServiceContainer,
	module: Module,
	params: Record<string, string>,
) {
	async function call<H extends Handler>(
		handler: H,
		request: Request,
	): Promise<Result<Awaited<ReturnType<H>>>> {
		const [args] = createMiddlewareArgs(scope, { request, params });

		let value: unknown;

		try {
			value = await handler(args as never);
		} catch (error) {
			if (!(error instanceof Response)) throw error;

			value = error;
		}

		if (value instanceof Response) {
			return {
				status: value.status,
				data: undefined,
				location: value.headers.get("Location"),
				response: value,
			};
		}

		// React Router exports DataWithResponseInit only as a type. Hence, an
		// instanceof check is not possible. The shape identifies its wrapped data.
		if (
			value !== null &&
			typeof value === "object" &&
			"type" in value &&
			value.type === "DataWithResponseInit" &&
			"data" in value &&
			"init" in value
		) {
			const result = value as UNSAFE_DataWithResponseInit<RouteData<Awaited<ReturnType<H>>>>;

			return {
				status: result.init?.status ?? 200,
				data: result.data,
				location: new Headers(result.init?.headers).get("Location"),
				response: undefined,
			};
		}

		return {
			status: 200,
			data: value as RouteData<Awaited<ReturnType<H>>>,
			location: null,
			response: undefined,
		};
	}

	function url(options: RequestOptions) {
		const url = new URL("http://localhost/");

		url.search = new URLSearchParams(options.query).toString();

		return url;
	}

	return {
		loader(options: RequestOptions = {}) {
			if (!module.loader) throw new Error("The route has no loader.");

			return call(module.loader as NonNullable<Module["loader"]>, new Request(url(options)));
		},
		action(fields: Record<string, string>, options: ActionOptions = {}) {
			if (!module.action) throw new Error("The route has no action.");

			const form = new FormData();

			for (const [name, value] of Object.entries(fields)) form.set(name, value);

			for (const file of options.files ?? []) form.append("files", file);

			return call(
				module.action as NonNullable<Module["action"]>,
				new Request(url(options), { method: "POST", body: form }),
			);
		},
	};
}
