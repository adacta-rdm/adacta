import type { IHTTPEndpointArgs } from "./IHTTPEndpointArgs";
import type { IHTTPEndpointReturnType } from "./IHTTPEndpointReturnType";

export interface IHTTPEndpoint<TReturnBody> {
	(args: IHTTPEndpointArgs):
		| IHTTPEndpointReturnType<TReturnBody>
		| Promise<IHTTPEndpointReturnType<TReturnBody>>;
}
