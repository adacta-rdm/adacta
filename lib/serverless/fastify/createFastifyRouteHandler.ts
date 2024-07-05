import type { RouteHandler } from "fastify/types/route";
import { StatusCodes } from "http-status-codes";

import type { IHTTPEndpoint } from "../../interface/IHTTPEndpoint";
import { castIHTTPEndpointArgs } from "../../interface/type_checks/castIHTTPEndpointArgs";

export function createFastifyRouteHandler<T>(handler: IHTTPEndpoint<T>): RouteHandler {
	return async function (request, reply) {
		const { body, params, headers, method } = request;

		if (typeof params !== "object" || params === null) {
			reply.statusCode = StatusCodes.BAD_REQUEST;
			return reply.send("Params must be an object");
		}

		const args = {
			params: body,
			http: {
				headers,
				method: method.toUpperCase(),
				path: request.raw.url,
			},
		};

		const response = await handler(castIHTTPEndpointArgs(args));

		if (typeof response.statusCode === "number") reply.statusCode = response.statusCode;
		if (response.headers) void reply.headers(response.headers);

		void reply.send(response.body);
	};
}
