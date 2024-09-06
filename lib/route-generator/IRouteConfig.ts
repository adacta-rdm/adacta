import type { Environment } from "relay-runtime";

import type { GraphQLHeaderService } from "~/apps/desktop-app/src/services/repositoryId/GraphQLHeaderService";

export interface IMatch {
	params: object;
	query: object;
}

export interface IRouteGetDataFunctionArgs<TMatch extends IMatch> {
	match: TMatch;
	relayEnvironment: Environment;
	graphQLHeaders: GraphQLHeaderService;
}

export interface IRouteComponentProps<
	TMatch extends IMatch,
	T extends (args: IRouteGetDataFunctionArgs<any>) => any
> {
	data: ReturnType<T>;
	match: TMatch;
	setQueryParam<U extends keyof TMatch["query"]>(param: U, value: TMatch["query"][U]): void;
	setQueryParams(params: Partial<TMatch["query"]>): void;
}

export type IRouteComponentPropsWithChildren<
	TMatch extends IMatch,
	T extends (args: IRouteGetDataFunctionArgs<any>) => any
> = React.PropsWithChildren<IRouteComponentProps<TMatch, T>>;

/**
 * @deprecated
 */
export interface IRouteGetDataFunction<T = unknown> {
	(args: any): T | Promise<T>;
}
