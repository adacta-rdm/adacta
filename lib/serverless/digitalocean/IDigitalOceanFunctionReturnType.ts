import type { Jsonify } from "type-fest";

export interface IDigitalOceanFunctionReturnType<T> {
	body?: Jsonify<T>;
	statusCode?: number;
	headers?: Record<string, string>;
}
