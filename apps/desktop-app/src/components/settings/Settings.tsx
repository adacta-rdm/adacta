import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { RemoteSettings } from "./RemoteSettings";
import { UserSettings } from "./UserSettings";
import { TabbedPageLayout } from "../layout/TabbedPageLayout";

import type { SettingsFragment$key } from "@/relay/SettingsFragment.graphql";
import { ChangeUserPassword } from "~/apps/desktop-app/src/components/settings/ChangeUserPassword";

export function Settings(props: { data: SettingsFragment$key }) {
	const data = useFragment(
		graphql`
			fragment SettingsFragment on RepositoryQuery {
				currentUser {
					...RemoteSettings
					...UserSettings
				}
			}
		`,
		props.data
	);

	return (
		<TabbedPageLayout
			pageHeader={{
				pageTitle: "User Settings",
				tabs: [
					{
						id: "remotes",
						label: "Repositories",
						content: <RemoteSettings currentUser={data.currentUser} />,
					},
					{
						id: "localization",
						label: "Localization",
						content: <UserSettings currentUser={data.currentUser} />,
					},
					{
						id: "password",
						label: "Password",
						content: <ChangeUserPassword />,
					},
				],
			}}
		/>
	);
}
