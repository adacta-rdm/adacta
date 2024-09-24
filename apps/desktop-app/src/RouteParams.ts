import type { RouterArgs } from "@/routes";

type KeysOfUnionExcludingQueryParams<T> = T extends Record<string, string> ? keyof T : never;

export type RouteParams = {
	[K in KeysOfUnionExcludingQueryParams<RouterArgs[1]>]?: string;
};
