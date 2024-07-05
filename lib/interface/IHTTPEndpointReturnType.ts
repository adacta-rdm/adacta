import type { Jsonify } from "type-fest";

export interface IHTTPEndpointReturnType<T> {
	body?: Jsonify<T>;
	statusCode?: number;
	headers?: Record<string, string>;
}
