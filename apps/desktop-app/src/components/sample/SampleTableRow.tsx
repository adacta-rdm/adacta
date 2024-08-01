import { EuiLink, EuiTableRow, EuiTableRowCell } from "@elastic/eui";
import { assertDefined } from "@omegadot/assert";
import type { ReactElement } from "react";
import React, { Fragment, Suspense } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { SampleLink } from "./SampleLink";
import { columnCount } from "./SampleTable";
import { useRepositoryId } from "../../services/router/UseRepoId";
import { DeviceLink } from "../device/DeviceLink";
import { ProjectListCollapsible } from "../project/ProjectListCollapsible";
import { ResourceListEntryLoading } from "../resource/list/ResourceListEntryLoading";
import { UserLink } from "../user/UserLink";
import { LoadChildrenRowsOnDemand } from "../utils/LoadChildrenRowsOnDemand";

import type { SampleTableRow$key } from "@/relay/SampleTableRow.graphql";
import type { SampleTableRowLazyQuery } from "@/relay/SampleTableRowLazyQuery.graphql";
import type { ISampleId } from "~/lib/database/Ids";

export function SampleTableRow(props: {
	sample: SampleTableRow$key;
	level: number;
	onAddRelatedClick: (id: ISampleId) => void;

	disableActions?: boolean;
}) {
	const sample = useFragment(
		graphql`
			fragment SampleTableRow on Sample {
				id
				...SampleLink
				metadata {
					creator {
						...UserLink
					}
				}
				device {
					...DeviceLink
				}
				relatedSamples {
					sample {
						id
					}
				}
				...ProjectListCollapsible
			}
		`,
		props.sample
	);

	const columns: ReactElement[] = [
		<EuiTableRowCell key={"nameColumn"}>
			<div style={{ paddingLeft: props.level * 20 }}>
				<SampleLink sample={sample} />
			</div>
		</EuiTableRowCell>,
		<EuiTableRowCell key={"creatorColumn"} align={"center"}>
			<UserLink user={sample.metadata.creator} />
		</EuiTableRowCell>,
		<EuiTableRowCell key={"projectsColumn"} align={"center"}>
			<ProjectListCollapsible data={sample} />
		</EuiTableRowCell>,
		<EuiTableRowCell key={"currentlyInstalledIn"} align={"center"}>
			{sample.device ? <DeviceLink data={sample.device} /> : null}
		</EuiTableRowCell>,
		<Fragment key={"actions"}>
			{props.disableActions ? null : (
				<EuiTableRowCell align={"center"}>
					<EuiLink
						onClick={() => props.onAddRelatedClick(sample.id as ISampleId)}
						color={"subdued"}
					>
						Add derived sample
					</EuiLink>
				</EuiTableRowCell>
			)}
		</Fragment>,
	];

	const repositoryId = useRepositoryId();
	assertDefined(repositoryId);

	const samples = sample.relatedSamples;

	return (
		<>
			<EuiTableRow>{columns}</EuiTableRow>
			{props.level >= 1 && (
				<LoadChildrenRowsOnDemand
					level={props.level}
					colSpan={columnCount}
					hasChildren={samples.length > 0}
					renderChildren={(level) =>
						samples.map((s) => {
							return (
								<Suspense key={s.sample.id} fallback={<ResourceListEntryLoading />}>
									<SampleTableRowLazy
										repositoryId={repositoryId}
										sampleId={s.sample.id}
										level={level + 1}
										onAddRelatedClick={props.onAddRelatedClick}
									/>
								</Suspense>
							);
						})
					}
				/>
			)}
		</>
	);
}

/**
 * Helper component which lazily loads children
 */
function SampleTableRowLazy(props: {
	repositoryId: string;
	sampleId: string;
	level: number;
	onAddRelatedClick: (id: ISampleId) => void;
}) {
	const sample = useLazyLoadQuery<SampleTableRowLazyQuery>(
		graphql`
			query SampleTableRowLazyQuery($repositoryId: ID!, $sampleId: ID!) {
				repository(id: $repositoryId) {
					sample(id: $sampleId) {
						...SampleTableRow
					}
				}
			}
		`,
		{ repositoryId: props.repositoryId, sampleId: props.sampleId },
		{ fetchPolicy: "store-and-network" }
	);

	return (
		<SampleTableRow
			sample={sample.repository.sample}
			level={props.level}
			onAddRelatedClick={props.onAddRelatedClick}
		/>
	);
}
