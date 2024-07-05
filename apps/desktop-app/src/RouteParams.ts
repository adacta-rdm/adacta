import type { RouterArgs } from "./routes";

type KeysOfUnion<T> = T extends any ? keyof T : never;

export type RouteParams = {
	[K in KeysOfUnion<RouterArgs[1]>]?: string;
};
