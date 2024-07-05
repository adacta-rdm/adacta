import type { RouteConfig, RouteObject } from "found";
import { Redirect } from "found";

type Route = string; //(typeof routes)[number];

export function configureRoutes(input: Record<Route, RouteObject | string>): RouteConfig {
	// Similar to the structure of the input, but with the routes with their correct relative paths and children set.
	// This way, we can conveniently query the object to find the parent of a route.
	// The root RouteObject is the one with the path "/" and we'll return the children property of that object.
	const root = { route: "/", path: "/", children: [] as IRouteObject[] };
	const routeNodes: Record<string, IRouteObject> = { "/": root };

	// Need to sort the input, so that the parents are processed first
	const sortedRoutes = Object.entries(input).sort(([a], [b]) => {
		// Split each route into segments based on the '/' delimiter
		const aSegments = a.split("/");
		const bSegments = b.split("/");

		// Iterate over each segment in the routes
		// The loop runs for the length of the shorter route to prevent out-of-bounds access
		const l = Math.min(aSegments.length, bSegments.length);
		for (let i = 0; i < l; i++) {
			// Check if the current segment in each route is a variable (begins with ':')
			const aIsVariable = aSegments[i][0] === ":";
			const bIsVariable = bSegments[i][0] === ":";

			// If one route's segment is variable and the other's is static, the static one should come first
			if (aIsVariable && !bIsVariable) {
				return 1; // a comes after b
			} else if (!aIsVariable && bIsVariable) {
				return -1; // a comes before b
			} else {
				// If both segments are either static or variable, compare them alphabetically
				const comparison = aSegments[i].localeCompare(bSegments[i]);
				// If the segments are not equal, return the comparison result
				if (comparison !== 0) {
					return comparison;
				}
			}
		}

		// If all segments are equal, compare the routes by length
		// This ensures that shorter routes come before longer ones
		return aSegments.length - bSegments.length;
	});
	for (const [route, cfg] of sortedRoutes) {
		if (typeof cfg === "string") {
			const redirect = new Redirect({ from: route, to: cfg });
			root.children.push(redirect as any);
			continue;
		}

		// Determine the parent belonging to this route
		// We initialize it to the root, so that if we can't find a parent, we'll use the root
		let parent: IRouteObject = root;
		const parts = route.split("/");
		// Normalize the parts, so that we don't have empty strings
		// .filter((part) => part !== "");

		while (parts.length > 0) {
			parts.pop();
			const parentPath = `${parts.join("/")}`;
			const parentCandidate = routeNodes[parentPath];

			// If the parent is a string, it's a redirect, and we can't use it as a parent
			if (typeof parentCandidate === "object") {
				parent = parentCandidate;
				break;
			}
		}

		// console.log(route, parent);

		// Determine the relative path of the route based on its parent.
		let path = `${route.slice(parent.route.length)}`;
		if (path[0] !== "/") path = `/${path}`;

		const { getData, Component } = cfg;
		const node: IRouteObject = {
			path,
			route,
			getData,
			Component,
		};

		if (!parent.children) parent.children = [];
		parent.children.push(node);
		routeNodes[route] = node;
	}

	return root.children as RouteConfig;
}

interface IRouteObject {
	/**
	 * The absolute path to the route.
	 */
	route: string;
	path: string;

	getData?: RouteObject["getData"];
	Component?: RouteObject["Component"];

	// Component?: (...args: unknown[]) => unknown;
	children?: IRouteObject[];
}
