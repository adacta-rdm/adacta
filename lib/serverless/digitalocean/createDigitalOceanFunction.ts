import { StatusCodes } from "http-status-codes";
import type { JsonObject } from "type-fest";

import type { IDigitalOceanFunction } from "./IDigitalOceanFunction";
import type { IDigitalOceanFunctionArgs } from "./IDigitalOceanFunctionArgs";
import type { IHTTPEndpointArgs } from "../../interface/IHTTPEndpointArgs";
import type { IHTTPEndpointReturnType } from "../../interface/IHTTPEndpointReturnType";

//////                                   NOTE                                  //////
// When debugging serverless functions on DigitalOcean using `doctl`, remember to
// set the `--remote-build` flag, i.e. `doctl sls deploy . --remote-build`.
// This flag seems to be used when deploying to App Platform and there a subtle
// differences to non-remote builds.
//
// Quotes from https://docs.digitalocean.com/products/functions/reference/build-process/
//
// > When you deploy using App Platform or when you run `doctl serverless deploy`
// > with the `--remote-build` flag, the Functions service performs a remote build.
// > The remote build uses the toolchains present in the runtime container for the
// > chosen language.
//
// > The behavior of local and remote builds can differ, not only because of
// > differences in the environment and available toolchains, but because certain
// > erroneous behavior might be tolerated in local builds but not in remote builds.

export function createDigitalOceanFunction<T extends IHTTPEndpointReturnType<any>>(
	fn: (args: IHTTPEndpointArgs) => Promise<T> | T
): IDigitalOceanFunction<T> {
	return async function doFn(args) {
		const params = getRequestArgs(args);

		const http: IHTTPEndpointArgs["http"] = {
			path: args.http.path,
			headers: sanitizeHeaders(args.http.headers),
			method: normalizeHTTPMethod(args.http.method),
		};

		try {
			return await fn({ params, http });
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error(error);
			return { statusCode: StatusCodes.INTERNAL_SERVER_ERROR };
		}
	};
}

/**
 * Returns the request arguments without the Digitalocean specific args.
 */
function getRequestArgs(args: IDigitalOceanFunctionArgs) {
	const request: JsonObject = {};

	for (const [k, v] of Object.entries(args)) {
		if (k.startsWith("__ow_") || v === undefined) continue;
		request[k] = v;
	}

	return request;
}

function normalizeHTTPMethod(method: string) {
	const normalized = method.toUpperCase();
	switch (normalized) {
		case "POST":
		case "GET":
		case "PUT":
		case "DELETE":
		case "OPTIONS":
		case "HEAD":
			return normalized;
	}
	throw new Error(`normalizeHTTPMethod: Received bad http method "${method}".`);
}

function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
	const initialValues: Record<string, string> = {};
	return Object.entries(headers).reduce((acc, [key, value]) => {
		acc[key.toLowerCase()] = value;
		return acc;
	}, initialValues);
}
