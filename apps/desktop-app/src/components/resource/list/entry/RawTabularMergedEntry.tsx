import { EuiTableRow, EuiTableRowCell } from "@elastic/eui";
import { isNonNullish } from "@omegadot/assert";
import React, { Suspense, useState } from "react";
import { graphql, useFragment } from "react-relay";

import { AddManualTransformation } from "./AddManualTransformation";
import { ResourceDevices } from "./ResourceDevices";
import type { IResourceComparisonOptions } from "./ResourceEntryContextMenu";
import { ResourceEntryContextMenu } from "./ResourceEntryContextMenu";
import type { PropsWithConnections } from "../../../../interfaces/PropsWithConnections";
import { useRepositoryId } from "../../../../services/router/UseRepoId";
import { Sparklines } from "../../../chart/Sparkline";
import { DateTime } from "../../../datetime/DateTime";
import { ProjectListCollapsible } from "../../../project/ProjectListCollapsible";
import { LoadChildrenRowsOnDemand } from "../../../utils/LoadChildrenRowsOnDemand";
import { PaddingHelper } from "../../../utils/PaddingHelper";
import { ResourceLink } from "../../ResourceLink";
import { ResourceListEntryLazy } from "../ResourceListEntry";
import { ResourceListEntryLoading } from "../ResourceListEntryLoading";
import { columnCount } from "../ResourceListTable";

import type { RawTabularMergedEntryFragment$key } from "@/relay/RawTabularMergedEntryFragment.graphql";
import { UserLink } from "~/apps/desktop-app/src/components/user/UserLink";
import { createMaybeDate } from "~/lib/createDate";

export function RawTabularMergedEntry(
	props: PropsWithConnections<{
		resource: RawTabularMergedEntryFragment$key;
		level: number;

		parents: string[];

		comparison?: IResourceComparisonOptions;
		showContextMenu?: boolean;
	}>
) {
	const [showAddManualTransformationModal, setShowAddManualTransformationModal] = useState(false);
	const data = useFragment(
		graphql`
			fragment RawTabularMergedEntryFragment on ResourceTabularData {
				id
				begin
				end
				...ResourceLink
				devices {
					...ResourceDevicesFragment
				}
				...Sparkline
				parent {
					id
					name
				}
				children {
					__id
					edges {
						node {
							id
						}
					}
				}
				metadata {
					creator {
						...UserLink
					}
				}
				...ProjectListCollapsible
			}
		`,
		props.resource
	);
	const repositoryId = useRepositoryId();

	const children = data.children.edges.map((e) => e?.node?.id).filter(isNonNullish);

	return (
		<>
			{showAddManualTransformationModal && (
				<AddManualTransformation
					onClose={() => setShowAddManualTransformationModal(false)}
					resourceId={data.id}
					parents={data.parent?.id ? [...props.parents, data.parent?.id] : props.parents}
					connections={props.connections}
				/>
			)}
			<EuiTableRow>
				<EuiTableRowCell>
					<PaddingHelper level={props.level}>
						<ResourceLink resource={data} />
					</PaddingHelper>
				</EuiTableRowCell>
				<EuiTableRowCell>
					<DateTime date={createMaybeDate(data.begin)} /> -{" "}
					<DateTime date={createMaybeDate(data.end)} />
				</EuiTableRowCell>
				<EuiTableRowCell truncateText={true} textOnly={false}>
					<ProjectListCollapsible data={data} />
				</EuiTableRowCell>
				<EuiTableRowCell>
					<ResourceDevices devices={data.devices.filter(isNonNullish)} />
				</EuiTableRowCell>
				<EuiTableRowCell truncateText={true} textOnly={false}>
					<Sparklines resource={data} />
				</EuiTableRowCell>
				<EuiTableRowCell>
					<UserLink user={data.metadata.creator} />
				</EuiTableRowCell>
				<EuiTableRowCell align={"right"}>
					{props.showContextMenu && (
						<ResourceEntryContextMenu
							entryType={"merged"}
							resourceId={data.id}
							resourceIdParentId={data.parent?.id}
							addManual={() => setShowAddManualTransformationModal(true)}
							connections={[...props.connections, data.children.__id]}
							comparison={props.comparison}
							fileName={data.parent?.name}
						/>
					)}
				</EuiTableRowCell>
			</EuiTableRow>
			<LoadChildrenRowsOnDemand
				level={props.level + 1}
				colSpan={columnCount}
				hasChildren={children.length > 0}
				renderChildren={(level) =>
					children.map((s) => {
						return (
							<Suspense key={s} fallback={<ResourceListEntryLoading />}>
								<ResourceListEntryLazy
									key={s}
									repositoryId={repositoryId}
									resourceId={s}
									level={level + 1}
									connections={[...props.connections, data.children.__id]}
									parents={[...props.parents, ...(data.parent?.id ? [data.parent?.id] : []), s]}
									showContextMenu={props.showContextMenu}
									comparison={props.comparison}
								/>
							</Suspense>
						);
					})
				}
			/>
		</>
	);
}
