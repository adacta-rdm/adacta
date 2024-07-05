import type { RouteConfig, RouteMatch, RouteObject } from "found";
import type { Environment } from "relay-runtime";

import { RouterServiceCore } from "./RouterServiceCore";
import { routeConfig } from "../../route-config";
import { configureRoutes } from "../../utils/configureRoutes";
import type { GraphQLHeaderService } from "../repositoryId/GraphQLHeaderService";

export class RouterService extends RouterServiceCore {
	public static getRouterConfig(
		relayEnvironment: Environment,
		graphQLHeaders: GraphQLHeaderService
	): RouteConfig {
		const config: Record<string, RouteObject | string> = {};

		for (const [path, cfg] of Object.entries(routeConfig)) {
			if (cfg.redirect) {
				config[path] = cfg.redirect;

				// Warn about other properties being ignored if present.
				// Only truthy values are considered, so, for example, exporting a variable with undefined is ok.
				// This is necessary due to the way the route generator generates the route config.
				if (Object.values(cfg).filter((val) => val).length > 1) {
					// How else would you warn about this?
					// eslint-disable-next-line no-console
					console.warn(
						`Route config for ${path} has a redirect and other properties. Only the redirect will be used.`
					);
				}

				continue;
			}

			const { getData, Component } = cfg;

			// Set the displayName of the component to the path for easier debugging
			if (Component) Component.displayName = `Route="${path}"`;

			config[path] = {
				getData: getData
					? (match: RouteMatch) => getData({ match, relayEnvironment, graphQLHeaders })
					: undefined,
				Component,
			};
		}

		return configureRoutes(config);
	}
}
