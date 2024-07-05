import Fastify from "fastify";

import { downsampleHTTPEndpoint } from "../src/microservices/downsampleHTTPEndpoint";

import { createFastifyRouteHandler } from "~/lib/serverless/fastify/createFastifyRouteHandler";

const url = new URL(process.env.SERVICES_URL ?? "http://localhost:3000");

const fastify = Fastify({
	logger: true,
});

fastify.all("/resources/downsample", createFastifyRouteHandler(downsampleHTTPEndpoint));

fastify.listen({ port: Number(url.port), host: url.hostname }, function (err, address) {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}

	// eslint-disable-next-line no-console
	console.log(`Server is now listening on ${address}`);
});
