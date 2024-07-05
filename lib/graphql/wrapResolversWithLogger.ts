import type { ResolversComposerMapping } from "@graphql-tools/resolvers-composition";
import { composeResolvers } from "@graphql-tools/resolvers-composition";
import type { ResolversComposition } from "@graphql-tools/resolvers-composition/typings/resolvers-composition";
import type { IResolvers } from "@graphql-tools/utils";
import type { GraphQLFieldResolver } from "graphql";
import { pathToArray } from "graphql/jsutils/Path";
import type { JsonObject, JsonValue } from "type-fest";

import type { Logger } from "../logger/Logger";

import type { IGraphQLContext } from "~/apps/repo-server/src/graphql/IGraphQLContext";

export function wrapResolversWithLogger(resolvers: IResolvers, logger: Logger): IResolvers {
	const logWrapper: ResolversComposition =
		(next): GraphQLFieldResolver<any, any> =>
		// Under some circumstances, args will be the context object
		(root, args: IGraphQLContext | JsonValue, context: IGraphQLContext | undefined, info) => {
			if (info === undefined) {
				return next(root, args, context, info);
			}

			const requestType = info.operation?.operation;
			const requestName = info.operation?.name?.value;

			const pathArray = pathToArray(info?.path);

			// Turn pathArray into a string where array indices are wrapped in brackets
			// For example: repository.devices.[0].name
			const prettyPath =
				pathArray
					.map((p) => {
						return typeof p === "number" ? `[${p}]` : p; // Wrap array indices in brackets
					})
					.join(".") ?? undefined;

			const resolverInfo = pathArray.length > 0 ? prettyPath : undefined;

			const loggerBound = logger.bind({
				requestType,
				requestName,
				resolverInfo,

				// Under some circumstances, args will be the context object, and we don't want to log that
				args:
					typeof (args as IGraphQLContext).setRepositoryInfo === "function"
						? undefined
						: (args as JsonValue),

				userId: context?.userId as string | undefined,

				repositoryName: context?.repositoryName as string | undefined,
			} as JsonObject);

			// This code gets executed for each resolver, but it should only log something when the
			// path is meaningful (i.e. not empty and not just "repository"). At the same time the
			// path length should not be too long, because then it's probably a call to a nested
			// resolver (i.e. repository.devices.edges.[24].node.properties) and that would cause
			// too much noise in the logs (think of a query requesting a list of devices).
			if (
				pathArray.length > 0 &&
				pathArray.length < 3 &&
				!(pathArray.length == 1 && pathArray[0] == "repository")
			) {
				loggerBound.info(`Request processing started: ${prettyPath}`);
			}

			const returnValue = next(root, args, context, info);

			// Turn "returnValue" into a promise if it isn't already
			void Promise.resolve(returnValue)
				// .then((v) =>
				// 	loggerBound.info(`Request processing finished: ${prettyPath}: ${JSON.stringify(v)}`)
				// )
				.catch((err) => {
					// Unwrap the error object into a plain object
					const errorString = JSON.stringify(
						err,
						err instanceof Error ? Object.getOwnPropertyNames(err) : undefined
					);
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const errorObj = JSON.parse(errorString);

					// Bind logger to error object
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const boundToError = loggerBound.bind({ error: errorObj });

					const errorMsg = err instanceof Error ? err.message : errorString;

					const resolverInfo = pathToArray(info?.path)
						.map((p) => {
							return typeof p === "number" ? `[${p}]` : p; // Wrap array indices in brackets
						})
						.join(".");

					boundToError.error(`Error in resolver ${resolverInfo}: ${errorMsg}`);
				});

			return returnValue;
		};

	const resolversComposition: ResolversComposerMapping = {
		"*.*": [logWrapper],
	};

	return composeResolvers(resolvers, resolversComposition);
}
