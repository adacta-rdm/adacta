import { EuiTable, EuiTableBody, EuiTableHeader, EuiTableHeaderCell } from "@elastic/eui";
import React from "react";
import { graphql, useFragment } from "react-relay";

import { ResourceListEntry } from "./ResourceListEntry";
import type { IResourceComparisonOptions } from "./entry/ResourceEntryContextMenu";
import type { PropsWithConnections } from "../../../interfaces/PropsWithConnections";

import type { ResourceListTableFragment$key } from "@/relay/ResourceListTableFragment.graphql";

export function ResourceListTable(
	props: PropsWithConnections<{
		resources: ResourceListTableFragment$key;

		comparison?: IResourceComparisonOptions;

		showContextMenu?: boolean;
	}>
) {
	const data = useFragment(
		graphql`
			fragment ResourceListTableFragment on Resource @relay(plural: true) {
				...ResourceListEntryFragment
			}
		`,
		props.resources
	);

	return (
		<EuiTable>
			<ResourceListHeader />
			<EuiTableBody>
				{data.map((r, i) => (
					<ResourceListEntry
						key={i}
						resource={r}
						level={0}
						parents={[]}
						connections={props.connections}
						comparison={props.comparison}
						showContextMenu={props.showContextMenu}
					/>
				))}
			</EuiTableBody>
		</EuiTable>
	);
}

const columns = [
	"Name",
	"Projects",
	"Time of recording",
	"Devices",
	"Preview",
	"Creator",
	"", // Context menu
] as const;
// Export column count to be able to automatically adjust colSpan in all components
export const columnCount = columns.length;

export function ResourceListHeader() {
	return (
		<EuiTableHeader>
			{columns.map((c) => (
				<EuiTableHeaderCell width={columnWidth(c)} key={c}>
					{c}
				</EuiTableHeaderCell>
			))}
		</EuiTableHeader>
	);
}

function columnWidth(columnName: (typeof columns)[number]) {
	if (columnName == "Projects") return 100;
	if (columnName == "") return 50; // Context menu
	return undefined;
}
