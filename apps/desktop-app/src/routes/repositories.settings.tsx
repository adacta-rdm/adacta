import React from "react";
import { graphql, loadQuery } from "react-relay";
import { usePreloadedQuery } from "react-relay/hooks";

import { Settings } from "../components/settings/Settings";

import type { repositoriesSettingsQuery } from "@/relay/repositoriesSettingsQuery.graphql";
import type { GetDataArgs, Props } from "@/routes/repositories.settings";

function getData(args: GetDataArgs) {
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

export default function Route(props: Props<typeof getData>) {
	const data = usePreloadedQuery(repositoriesSettingsGraphQLQuery, props.data);
	return <Settings data={data} />;
}
