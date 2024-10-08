import type { Route, RouterArgs } from "@/routes";
import { routes } from "@/routes";

export function isRouterArgs(args: unknown[]): args is RouterArgs {
	const [route, params = {}, ...rest] = args;

	if (rest.length > 0) return false;
	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
	if (!params || typeof params !== "object") return false;

	if (!isRoute(route)) return false;

	for (const part of route.split("/")) {
		if (
			part[0] === ":" &&
			(params as Record<string, undefined | string>)[part.slice(1)] === undefined
		)
			return false;
	}

	return true;
}

function isRoute(arg: unknown): arg is Route {
	for (const route of routes) {
		if (arg === route) return true;
	}
	return false;
}
