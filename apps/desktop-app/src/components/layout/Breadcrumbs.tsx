import type { EuiBreadcrumb } from "@elastic/eui";
import { EuiHeaderBreadcrumbs, EuiLink, EuiThemeProvider } from "@elastic/eui";
import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { LazyNameLoader } from "./LazyNameLoader";
import { LazyUserNameLoader } from "./LazyUserNameLoader";
import type { RouteParams } from "../../RouteParams";
import { useRouter } from "../../hooks/useRouter";
import { isRouterArgs } from "../../utils/isRouterArgs";
import { RepositoryPicker } from "../repositoryPicker/RepositoryPicker";

import type { BreadcrumbsFragment$key } from "@/relay/BreadcrumbsFragment.graphql";
import { assertUnreachable } from "~/lib/assert/assertUnreachable";

const BreadcrumbsFragment = graphql`
	fragment BreadcrumbsFragment on RepositoryQuery {
		currentUser {
			...RepositoryPicker
		}
	}
`;

export function Breadcrumbs(props: { data: BreadcrumbsFragment$key }) {
	const data = useFragment(BreadcrumbsFragment, props.data);
	const { router, match } = useRouter();

	const params: RouteParams = match.params;

	// This is the route definition of the current route. It is not a standard property defined by found, but
	// it is added by the router service.
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const routeDef: string | undefined = match.routes[match.routes.length - 1].route;

	if (!routeDef) return null;

	const defParts = routeDef.split("/").filter((part) => part !== "");

	const breadcrumbs: EuiBreadcrumb[] = defParts
		.map((part) => {
			// Handle variables
			if (part[0] === ":") {
				const property = part.slice(1) as keyof RouteParams;
				const value = params[property];
				if (!value) return "?";

				switch (property) {
					case "repositoryId":
						return <RepositoryPicker user={data.currentUser} repositoryId={params[property]} />;
					case "deviceId":
					case "sampleId":
					case "resourceId":
					case "projectId":
						return <LazyNameLoader thingId={value} />;
					case "userId":
						return <LazyUserNameLoader userId={value} />;
					case "deviceTimestamp":
						return undefined;
					default:
						assertUnreachable(property);
				}
			} else {
				return part.charAt(0).toUpperCase() + part.slice(1);
			}
		})
		.filter(Boolean)
		.map((element, i): EuiBreadcrumb => {
			// Construct the new route from the first i + 1 parts of the current location, passing along the current
			// route parameters.
			// This is safe as long as there are no routes defined which "skip" parts of the location,
			// (i.e., /path/ and /path/sub-path/sub-sub-path defined, but not /path/sub-path).
			const routerArgs = [`/${defParts.slice(0, i + 1).join("/")}/`, params];

			// Makes the first breadcrumb a link to /repositories/settings instead of /repositories/ because
			// the latter redirects to the first repository, which is not what we want.
			if (routerArgs[0] === "/repositories/") {
				routerArgs[0] = "/repositories/settings";
				routerArgs[1] = {};
			}

			return {
				// Display a link only if we've been able to construct a valid route dynamically.
				text:
					typeof element === "string" ? (
						isRouterArgs(routerArgs) ? (
							<EuiLink onClick={() => router.push(...routerArgs)} color="text">
								{element}
							</EuiLink>
						) : (
							element
						)
					) : (
						<EuiLink color="text">{element}</EuiLink>
					),
			};
		});

	return (
		<EuiThemeProvider colorMode={"dark"}>
			<EuiHeaderBreadcrumbs aria-label="Header breadcrumbs" breadcrumbs={breadcrumbs} />
		</EuiThemeProvider>
	);
}
