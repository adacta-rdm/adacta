/* eslint-disable react-hooks/rules-of-hooks */
import http from "http";

import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import expressAsyncHandler from "express-async-handler";
import { useServer } from "graphql-ws/lib/use/ws";
import { StatusCodes } from "http-status-codes";
import morgan from "morgan";
import { WebSocketServer as WebSocketServer } from "ws";

import { AppConfig } from "./config/AppConfig";
import { AuthConfig } from "./config/AuthConfig";
import { AuthenticatedUserInfo } from "./graphql/AuthenticatedUserInfo";
import { ContextFactory } from "./graphql/ContextFactory";
import { RepositoryInfo } from "./graphql/RepositoryInfo";
import { resolvers } from "./graphql/resolvers";
import { login } from "./routes/auth/login";
import type { EntityLoader } from "./services/EntityLoader";
import { RepositoryManagerPostgres } from "./services/RepositoryManagerPostgres";
import { protectRoute } from "./utils/protectRoute";

import { PostgresConfig } from "~/apps/repo-server/src/config/PostgresConfig";
import { changePass } from "~/apps/repo-server/src/routes/auth/changePass";
import { register } from "~/apps/repo-server/src/routes/auth/register";
import { PACKAGE_VERSION, TYPE_DEFS } from "~/lib/buildTimeConstants";
import { createVersionResponse } from "~/lib/createVersionResponse";
import { wrapResolversWithLogger } from "~/lib/graphql/wrapResolversWithLogger";
import type { IHTTPEndpointArgs } from "~/lib/interface/IHTTPEndpointArgs";
import type { IHTTPEndpointReturnType } from "~/lib/interface/IHTTPEndpointReturnType";
import { castIHTTPEndpointArgs } from "~/lib/interface/type_checks/castIHTTPEndpointArgs";
import { Logger } from "~/lib/logger/Logger";
import { ServiceContainer } from "~/lib/serviceContainer/ServiceContainer";

async function main() {
	const config = ServiceContainer.get(AppConfig);
	const logger = ServiceContainer.set(
		new Logger({ level: config.logLevel, stream: process.stdout })
	);

	const app = express();
	const httpServer = http.createServer(app);

	if (TYPE_DEFS.length === 0) {
		throw new Error("Schema laden mal wieder kaputt :(");
	}

	// Enable CORS. This is now necessary because the repo server is accessed from the renderer process of the desktop
	// app, which runs in a different origin.
	// TODO: Only activate this in development mode. Not needed in production because CORS is configured on DigitalOcean.
	app.use(cors());

	// Configure logger "morgan"
	app.use(morgan("combined"));
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());

	// Helper function to handle common tasks for /login and /register
	async function handleAuthEndpoint<T>(
		req: express.Request,
		res: express.Response,
		endpointHandler: (
			args: IHTTPEndpointArgs,
			logger: Logger,
			el: EntityLoader,
			cfg: AuthConfig
		) => Promise<IHTTPEndpointReturnType<T>>
	) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { body, params, headers, method } = req;

		if (typeof params !== "object" || params === null) {
			res.statusCode = StatusCodes.BAD_REQUEST;
			res.send("Params must be an object");
			return;
		}

		const ctx = ServiceContainer.get(ContextFactory).constructRequestContext();
		const el = ctx.getEntityLoader();

		const args = {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			params: body,
			http: {
				headers,
				method: method.toUpperCase(),
				path: req.url,
			},
		};

		const response = await endpointHandler(
			castIHTTPEndpointArgs(args),
			logger,
			el,
			ServiceContainer.get(AuthConfig)
		);

		if (typeof response.statusCode === "number") res.statusCode = response.statusCode;
		if (response.headers) {
			for (const [key, val] of Object.entries(response.headers)) {
				res.header(key, val);
			}
		}

		res.send(response.body);
	}

	app.post(
		"/login",
		expressAsyncHandler(async (req, res) => {
			await handleAuthEndpoint(req, res, login);
		})
	);

	app.post(
		"/register",
		expressAsyncHandler(async (req, res) => {
			await handleAuthEndpoint(req, res, register);
		})
	);

	app.post(
		"/change-password",
		expressAsyncHandler(async (req, res) => {
			await handleAuthEndpoint(req, res, (args, logger, el) => changePass(args, logger, el, req));
		})
	);

	// For now only ensures that the user has successfully authenticated himself with the auth-service, but
	// no other access checks are performed. This means that as long as the user is logged in, he/she has full access
	// privileges on any repository on this server.
	app.use(protectRoute);

	// Same ApolloServer initialization as before, plus the drain plugin.
	const schema = makeExecutableSchema({
		typeDefs: TYPE_DEFS,
		resolvers: wrapResolversWithLogger(resolvers, logger.bind({ class: "Resolvers" })),
		inheritResolversFromInterfaces: true,
	});

	// Creating the WebSocket server
	const wsServer = new WebSocketServer({
		// This is the `httpServer` we created in a previous step.
		server: httpServer,

		// Pass a different path here if your ApolloServer serves at
		// a different path.
		path: "/graphql",
	});

	const server = new ApolloServer({
		schema,
		resolvers,
		csrfPrevention: true,
		cache: "bounded", // Bounded cache recommended by Apollo to avoid DOS
		context: async ({ req, res }) => {
			try {
				const userInfo = AuthenticatedUserInfo.createFromHTTPHeaders(req.headers);
				const repoInfo = RepositoryInfo.createFromHTTPHeaders(req.headers);

				// Expose the version (of the server) in the response headers
				res.header("adacta-version", PACKAGE_VERSION);

				// Instruct CORS that we want to expose the adacta-version header
				res.header("Access-Control-Expose-Headers", "adacta-version");

				// Need to await here so we can catch any errors below. Otherwise, the try-catch-block becomes useless
				return await ServiceContainer.get(ContextFactory).constructGraphQLContext(
					userInfo,
					repoInfo
				);
			} catch (e: any) {
				if (e instanceof Error) {
					logger.error(e.message);
					throw e;
				}
				throw new Error("Unknown error");
			}
		},
		plugins: [
			// Proper shutdown for the HTTP server.
			ApolloServerPluginDrainHttpServer({ httpServer }),
			// Proper shutdown for the WebSocket server.
			{
				// Types require an async function...
				// eslint-disable-next-line @typescript-eslint/require-await
				async serverWillStart() {
					return {
						async drainServer() {
							await serverCleanup.dispose();
						},
					};
				},
			},
		],
	});

	const serverCleanup = useServer(
		{
			schema,
			context: (subscriptionContext) => {
				const userInfo = AuthenticatedUserInfo.createFromHTTPHeaders(
					subscriptionContext.connectionParams
				);
				const repoInfo = RepositoryInfo.createFromHTTPHeaders(subscriptionContext.connectionParams);

				return ServiceContainer.get(ContextFactory).constructGraphQLContext(userInfo, repoInfo);
			},
		},
		wsServer
	);

	await server.start();

	server.applyMiddleware({
		app,
		path: "/graphql",
	});

	// Temporary init db route
	app.use(
		"/init-db",
		expressAsyncHandler(async (req, res) => {
			const repoName = req.query.name;

			if (typeof repoName !== "string") {
				res.statusCode = 400; // HTTP_STATUS_BAD_REQUEST;
				res.send("Invalid or missing repo name");
				return;
			}

			await ServiceContainer.get(RepositoryManagerPostgres).createRepository(repoName);
			res.send("Done");
		})
	);

	const rmp = new RepositoryManagerPostgres(ServiceContainer.get(PostgresConfig), logger);
	ServiceContainer.set(rmp);
	logger.info("Starting migration...");
	await rmp.migrate();

	app.get("/version", (_, res) => {
		res.send({ ...createVersionResponse() });
	});

	httpServer.listen({ port: config.port }, () => {
		logger.info(`🚀 Server ready at http://localhost:${config.port}`);
		logger.info(`GraphQL: http://localhost:${config.port}${server.graphqlPath}`);
		logger.info(`Public: ${config.publicURL}`);

		logger.info(`Log level is: ${config.logLevel}`);
	});
}

process.on("unhandledRejection", (reason, promise) => {
	// eslint-disable-next-line no-console
	console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// eslint-disable-next-line no-console
void main().catch(console.log);
