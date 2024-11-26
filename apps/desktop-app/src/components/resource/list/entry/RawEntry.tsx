import { EuiLink, EuiTableRow, EuiTableRowCell, EuiText } from "@elastic/eui";
import React from "react";
import { graphql, useFragment } from "react-relay";

import type { IResourceComparisonOptions } from "./ResourceEntryContextMenu";
import { ResourceEntryContextMenu } from "./ResourceEntryContextMenu";
import type { PropsWithConnections } from "../../../../interfaces/PropsWithConnections";
import { useRepoRouterHook } from "../../../../services/router/RepoRouterHook";
import { PaddingHelper } from "../../../utils/PaddingHelper";
import { ResourceLink } from "../../ResourceLink";
import { columnCount } from "../ResourceListTable";

import type { RawEntryFragment$key } from "@/relay/RawEntryFragment.graphql";
import { UserLink } from "~/apps/desktop-app/src/components/user/UserLink";
import { assertDefined } from "~/lib/assert/assertDefined";

export function RawEntry(
	props: PropsWithConnections<{
		resource: RawEntryFragment$key;
		level: number;

		showContextMenu?: boolean;

		comparison?: IResourceComparisonOptions;
	}>
) {
	const data = useFragment(
		graphql`
			fragment RawEntryFragment on ResourceGeneric {
				id
				name
				uploadDeviceId
				...ResourceLink
				metadata {
					creator {
						...UserLink
					}
				}
			}
		`,
		props.resource
	);

	const { router, repositoryId } = useRepoRouterHook();

	function handleImport() {
		assertDefined(data.uploadDeviceId);
		router.push("/repositories/:repositoryId/devices/:deviceId/importer/:resourceId", {
			repositoryId,
			deviceId: data.uploadDeviceId,
			resourceId: data.id,
		});
	}

	return (
		<EuiTableRow>
			<EuiTableRowCell>
				<PaddingHelper level={props.level}>
					<ResourceLink resource={data} />
				</PaddingHelper>
			</EuiTableRowCell>
			<EuiTableRowCell colSpan={columnCount - 3} align="center" color={"subdued"}>
				<EuiText color={"subdued"} size={"xs"}>
					<EuiLink color={"subdued"} onClick={handleImport}>
						Import
					</EuiLink>{" "}
					this resource to show more information
				</EuiText>
			</EuiTableRowCell>
			<EuiTableRowCell>
				<UserLink user={data.metadata.creator} />
			</EuiTableRowCell>
			{props.showContextMenu && data.uploadDeviceId && (
				<EuiTableRowCell align={"right"}>
					<ResourceEntryContextMenu
						entryType={"raw"}
						connections={props.connections}
						resourceId={data.id}
						import={handleImport}
						comparison={props.comparison}
						fileName={data.name}
					/>
				</EuiTableRowCell>
			)}
		</EuiTableRow>
	);
}
