/**
 * Production server.
 *
 * Static files from the client build are served directly. Everything else is
 * handed to the React Router request handler. That handler renders on the
 * server.
 *
 * Run "bun run build" first. The server build does not exist before that.
 */
import { createRequestHandler, type ServerBuild } from "react-router";

// The path is held in a variable so TypeScript does not try to resolve the
// server build at type-check time. It only exists after a build.
const serverBuildPath = "./build/server/index.js";
const build = (await import(serverBuildPath)) as ServerBuild;

const handleRequest = createRequestHandler(build, "production");

const port = Number(Bun.env.PORT ?? 3000);

Bun.serve({
	port,

	async fetch(request) {
		const { pathname } = new URL(request.url);

		// The URL parser already removes ".." segments. This cannot escape
		// the client build directory.
		const file = Bun.file(`./build/client${pathname}`);

		if (await file.exists()) {
			return new Response(file);
		}

		return handleRequest(request);
	},
});

console.log(`Listening on http://localhost:${port}`);
