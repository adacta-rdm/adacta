import React from "react";
import { graphql, loadQuery } from "react-relay";
import { usePreloadedQuery } from "react-relay/hooks";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { Settings } from "../components/settings/Settings";

import type { repositoriesSettingsQuery } from "@/relay/repositoriesSettingsQuery.graphql";

export function getData(args: IRouteGetDataFunctionArgs) {
	return loadQuery<repositoriesSettingsQuery>(
		args.relayEnvironment,
		repositoriesSettingsGraphQLQuery,
		{}
	);
}

const repositoriesSettingsGraphQLQuery = graphql`
	query repositoriesSettingsQuery {
		...SettingsFragment
	}
`;

export default function (props: IRouteComponentProps<typeof getData>) {
	const data = usePreloadedQuery(repositoriesSettingsGraphQLQuery, props.data);
	return <Settings data={data} />;
}
