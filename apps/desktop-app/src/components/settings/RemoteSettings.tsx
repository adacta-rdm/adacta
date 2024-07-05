import type { EuiBasicTableColumn } from "@elastic/eui";
import { EuiBasicTable } from "@elastic/eui";
import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { Link } from "../Link";

import type { RemoteSettings$key } from "@/relay/RemoteSettings.graphql";
import type { ArrayElementType } from "~/lib/interface/ArrayElementType";

const RemoteSettingsGraphQLFragment = graphql`
	fragment RemoteSettings on CurrentUser {
		payload {
			user {
				repositories
			}
		}
	}
`;

export function RemoteSettings(props: { currentUser: RemoteSettings$key }) {
	const currentUser = useFragment(RemoteSettingsGraphQLFragment, props.currentUser);

	const repositories = currentUser.payload.user.repositories.map((r) => ({
		name: r,
	}));

	const columns: EuiBasicTableColumn<ArrayElementType<typeof repositories>>[] = [
		{
			field: "name",
			name: "Name",
			render: function NameColumn(_, item) {
				return (
					<Link href="#" to={["/repositories/:repositoryId/", { repositoryId: item.name }]}>
						{item.name}
					</Link>
				);
			},
		},
	];

	return <EuiBasicTable items={repositories} rowHeader="firstName" columns={columns} />;
}
