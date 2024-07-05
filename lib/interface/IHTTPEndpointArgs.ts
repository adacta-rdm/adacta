import type { JsonObject } from "type-fest";

import type { IHTTPMethod } from "./IHTTPMethod";

export interface IHTTPEndpointArgs {
	params: JsonObject;
	http: {
		headers: Record<string, string | undefined>;
		method: IHTTPMethod;
		path: string;
	};
}
