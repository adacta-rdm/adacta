import type { RouteMatch } from "found";
import type { Environment } from "relay-runtime";

import type { GraphQLHeaderService } from "./services/repositoryId/GraphQLHeaderService";

export interface IRouteGetDataFunctionArgs {
	match: RouteMatch;
	relayEnvironment: Environment;
	graphQLHeaders: GraphQLHeaderService;
}

export interface IRouteComponentProps<T extends (...args: any) => any> {
	data: ReturnType<T>;
	match: RouteMatch;
}

export type IRouteComponentPropsWithChildren<T extends (...args: any) => any> =
	React.PropsWithChildren<IRouteComponentProps<T>>;

export interface IRouteGetDataFunction<T = unknown> {
	(args: IRouteGetDataFunctionArgs): T | Promise<T>;
}
