import { EuiLink } from "@elastic/eui";
import type { Match, RedirectProps, Router, RouterState } from "found";
import * as React from "react";
import type { PropsWithChildren } from "react";

export function useRouter(): RouterState {
	return {
		router,
		match,
	};
}

export const Link = (props: PropsWithChildren<object>) => (
	<EuiLink {...props}>{props.children}</EuiLink>
);
export class Redirect extends React.Component<RedirectProps> {}

export class RedirectException extends Error {}

const router: Router = {
	addNavigationListener(): any {},
	createHref(): any {},
	createLocation(): any {},
	go() {},
	isActive(): any {},
	matcher: {
		match(): any {},
		getRoutes(): any {},
		isActive(): any {},
		format(): any {},
	},
	push() {},
	replace() {},
	replaceRouteConfig() {},
};

const match: Match = {
	context: undefined,
	location: {
		action: "REPLACE",
		delta: 0,
		hash: "",
		index: 0,
		key: "",
		pathname: "",
		query: {},
		search: "",
		state: undefined,
	},
	params: {
		org: "",
		view: "",
	},
	router,
	routeIndices: [],
	routeParams: [],
	routes: [],
};
