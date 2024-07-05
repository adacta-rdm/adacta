import type { IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { RedirectException } from "../RedirectException";

export function getData({ graphQLHeaders }: IRouteGetDataFunctionArgs) {
	graphQLHeaders.authToken = undefined;
	throw new RedirectException("/login");
}

export default function () {
	return null;
}
