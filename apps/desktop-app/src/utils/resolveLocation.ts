import type { Opaque } from "type-fest";

import type { RouterArgs } from "@/routes";

/**
 * A string representing a location in the app that can be navigated to. The structure of the string is guaranteed to
 * be resolvable to a route and parameters.
 */
export type Location = Opaque<string, RouterArgs>;

/**
 * This function is used to resolve the location based on the provided route and parameters.
 * It takes a route as a string and an optional parameters object as arguments.
 * The route is a string where each part is separated by a "/".
 * If a part of the route starts with ":", it is considered a parameter and will be replaced by the corresponding value from the parameters object.
 * If a parameter is not provided in the parameters object, an error will be thrown.
 * The function returns the resolved location as a string.
 *
 * @param {...RouterArgs} args - The arguments for the function. The first argument is the route as a string. The second argument is an optional parameters object.
 * @returns {string} - The resolved location as a string.
 * @throws {Error} - Throws an error if a parameter is missing in the parameters object for a route part.
 */
export function resolveLocation(...args: RouterArgs): Location {
	const args_ = args as
		| [string]
		| [
				string,
				Record<string, string | undefined> | undefined,
				Record<string, string | undefined> | undefined
		  ];
	const route = args_[0];

	const params: Record<string, string | undefined> = args_[1] ?? {};

	let location = route
		.split("/")
		.map((part) => {
			const r = part[0] === ":" ? params[part.slice(1)] : part;
			if (r === undefined) {
				throw new Error(`Missing parameter "${part}" for route ${route}`);
			}
			return r;
		})
		.join("/");

	const queryParams = Object.entries((/\/:/.test(route) ? args_[2] : args_[1]) ?? {});
	if (queryParams.length > 0) {
		location += `?${queryParams
			.filter(([, value]) => value !== undefined)
			.map(([key, value]) => `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`)
			.join("&")}`;
	}

	return location as Location;
}
