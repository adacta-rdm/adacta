import type { RouteConfig, RouteMatch, RouteObject } from "found";
import type { ComponentType, ReactNode } from "react";
import { Suspense, createElement } from "react";
import type { Environment } from "relay-runtime";

import { RouterServiceCore } from "./RouterServiceCore";
import { configureRoutes } from "../../utils/configureRoutes";
import type { GraphQLHeaderService } from "../repositoryId/GraphQLHeaderService";

import routeConfig from "@/route-config";
import { resolveLocation } from "~/apps/desktop-app/src/utils/resolveLocation";

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

			const { getData, default: Component, LoadingState } = cfg;

			const routeObject: RouteObject = {};

			if (getData) {
				routeObject.getData = (matchRaw: RouteMatch) => {
					const match = {
						params: matchRaw.params,
						query: cfg.deserializeQueryParams
							? cfg.deserializeQueryParams(matchRaw.location.query)
							: {},
					};
					const data = getData({
						match,
						relayEnvironment,
						graphQLHeaders,
					});

					return {
						data,
						match,
						setQueryParam(param: string, value: unknown) {
							// Types seem to be wrong here, but it works
							// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
							const route = (matchRaw.route as RouteObject).route;
							const location = (resolveLocation as (...args: any[]) => string)(
								route,
								match.params,
								{
									...match.query,
									[param]: value,
								}
							);

							matchRaw.router.replace(location);
						},
					};
				};
			}

			if (Component) {
				// Set the displayName of the component to the path for easier debugging
				Component.displayName = `Route="${path}"`;

				let RouteComponent: ComponentType<any>;

				// Must explicitly opt out of suspense by setting `LoadingState` to false.
				if (LoadingState === false) {
					RouteComponent = Component;
				} else {
					const fallback: ReactNode =
						LoadingState === true || LoadingState === undefined || LoadingState === null
							? null
							: createElement(LoadingState);

					// eslint-disable-next-line react/display-name
					RouteComponent = (props: any) => (
						<Suspense fallback={fallback}>
							<Component {...props} />
						</Suspense>
					);
					RouteComponent.displayName = `RouteSuspense="${path}"`;
				}

				// Using the render option gives us control over the props passed to the component.
				// Without render, our custom props which come from `getData` would be embedded in the `data` prop, making it
				// awkward to access them (e.g. `props.data.data`, `props.data.match`, etc.).
				routeObject.render = (props) => <RouteComponent {...props.data} />;
			}

			config[path] = routeObject;
		}

		return configureRoutes(config);
	}
}
