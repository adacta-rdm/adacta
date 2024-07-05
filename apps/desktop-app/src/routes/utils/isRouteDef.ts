import type { RouteDef } from "../../routes";
import { routes } from "../../routes";

export function isRouteDef(route: unknown): route is RouteDef {
	return routes.includes(route as RouteDef);
}
