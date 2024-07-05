import type { JsonValue } from "type-fest";

export interface IDigitalOceanFunctionArgs {
	__ow_headers: Record<string, string>;
	__ow_path: string;
	__ow_method: "post" | "get" | "put" | "delete" | "head" | "options";
	__ow_isBase64Encoded?: boolean;
	__ow_body?: string;

	http: {
		headers: Record<string, string>;
		method: string;
		path: string;
	};

	[argName: string]: JsonValue | undefined;
}
