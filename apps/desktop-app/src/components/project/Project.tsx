import assert from "assert";

import type { EuiBasicTableColumn } from "@elastic/eui";
import {
	EuiFieldSearch,
	EuiFlexGroup,
	EuiFlexItem,
	EuiInMemoryTable,
	EuiPageTemplate,
	EuiSpacer,
} from "@elastic/eui";
import type { Criteria } from "@elastic/eui/src/components/basic_table/basic_table";
import { assertDefined } from "@omegadot/assert";
import React, { useState } from "react";
import {
	graphql,
	useMutation,
	useRefetchableFragment,
	useSubscribeToInvalidationState,
} from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";
import type { ArrayElement } from "type-fest/source/internal";

import { useRepositoryId } from "../../services/router/UseRepoId";
import { DeviceLink } from "../device/DeviceLink";
import { AdactaPageTemplate } from "../layout/AdactaPageTemplate";
import { OriginRepoIndicator } from "../originRepo/OriginRepoIndicator";
import { ResourceLink } from "../resource/ResourceLink";
import { SampleLink } from "../sample/SampleLink";

import type { ProjectDeleteThingMutation } from "@/relay/ProjectDeleteThingMutation.graphql";
import type { ProjectFragment$data, ProjectFragment$key } from "@/relay/ProjectFragment.graphql";
import type { ProjectQuery } from "@/relay/ProjectQuery.graphql";

export const ProjectGraphqlQuery = graphql`
	query ProjectQuery($projectId: ID!, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			project(id: $projectId) {
				...ProjectFragment
			}
		}
	}
`;

// Interface for the data that gets passed to the table.
interface IProjectEntry {
	id: string;

	// Data is used to render the "name" as clickable links
	data: ArrayElement<ProjectFragment$data["contents"]>;

	// Used for sorting the "name" column
	name: string;

	// Used to render the "type" column and for sorting of the "type" column
	type: string;
}

// Actually rendered columns.
type TRenderedColumns = Omit<IProjectEntry, "data">;

function typenameToDisplayName(
	typename: Readonly<"Device" | "Sample" | "ResourceGeneric" | "ResourceTabularData">
) {
	switch (typename) {
		case "ResourceGeneric":
			return "Resource (Raw)";
		case "ResourceTabularData":
			return "Resource (Tabular)";
		case "Device":
		case "Sample":
			return typename;
	}
}

export function Project(props: { queryRef: PreloadedQuery<ProjectQuery> }) {
	const { repository } = usePreloadedQuery(ProjectGraphqlQuery, props.queryRef);
	const { project } = repository;
	return <ProjectCore data={project} />;
}

function ProjectCore(props: { data: ProjectFragment$key }) {
	const repositoryId = useRepositoryId();
	const [data, refetch] = useRefetchableFragment(
		graphql`
			fragment ProjectFragment on Project @refetchable(queryName: "ProjectRefetchQuery") {
				__typename
				id
				name
				contents {
					id
					__typename
					... on ResourceGeneric {
						name
						...ResourceLink
					}
					... on ResourceTabularData {
						name
						...ResourceLink
					}
					... on Device {
						name
						...DeviceLink
					}
					... on Sample {
						name
						...SampleLink
					}
				}
				...OriginRepoIndicator
			}
		`,
		props.data
	);

	const [sortField, setSortField] = useState<keyof TRenderedColumns>("name");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [searchTerm, setSearchTerm] = useState("");

	const [deleteThingFromProjectMutation] = useMutation<ProjectDeleteThingMutation>(
		graphql`
			mutation ProjectDeleteThingMutation($repositoryId: ID!, $input: RemoveFromProjectInput!) {
				repository(id: $repositoryId) {
					removeFromProject(input: $input) {
						deletedProjectId
					}
				}
			}
		`
	);

	useSubscribeToInvalidationState([data.id], () => refetch({}));

	const deleteThingFromProject = (id: string) => {
		deleteThingFromProjectMutation({
			variables: { input: { id, projectId: data.id }, repositoryId: repositoryId },
			updater: (store, data) => {
				store.get(data.repository.removeFromProject.deletedProjectId)?.invalidateRecord();
			},
		});
	};

	const things: IProjectEntry[] = [...data.contents]
		.sort((a, b) => {
			assert(a.__typename !== "%other");
			assert(b.__typename !== "%other");
			assertDefined(a.name, "Name of project entry is undefined");
			assertDefined(b.name, "Name of project entry is undefined");

			const factor = sortDirection === "asc" ? -1 : 1;

			const sortByType = a.__typename.localeCompare(b.__typename) * factor;
			const sortByName = a.name.localeCompare(b.name) * factor;

			if (sortField === "name") {
				// Sort by name (first) and then by type (second). This uses the fact that
				// sortByName is 0 (falsy) if the names are equal. In that case "sortByType" is
				// evaluated.
				return sortByName || sortByType;
			}

			if (sortField == "type") {
				return sortByType || sortByName;
			}

			throw new Error(`Unable to sort by ${sortField}`);
		})
		.flatMap((c): IProjectEntry | IProjectEntry[] => {
			if (
				c.__typename === "ResourceGeneric" ||
				c.__typename === "ResourceTabularData" ||
				c.__typename == "Device" ||
				c.__typename == "Sample"
			) {
				assertDefined(c.name, "Name of project entry is undefined");
				return { id: c.id, data: c, name: c.name, type: typenameToDisplayName(c.__typename) };
			}

			return [];
		});

	const thingsFiltered =
		searchTerm !== ""
			? things.filter(
					(t) =>
						t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
						t.type.toLowerCase().includes(searchTerm.toLowerCase())
			  )
			: things;

	const renderLink = (entry: IProjectEntry["data"]) => {
		switch (entry.__typename) {
			case "ResourceGeneric":
			case "ResourceTabularData":
				return <ResourceLink resource={entry} />;
			case "Device":
				return <DeviceLink data={entry} />;
			case "Sample":
				return <SampleLink sample={entry} />;
		}
	};

	const columns: Array<EuiBasicTableColumn<IProjectEntry>> = [
		{
			name: "Name",
			field: "name",
			render: (_, entry) => renderLink(entry.data),
			sortable: (e) => e.name,
		},
		{
			name: "Type",
			field: "type",
			sortable: true,
		},
		{
			actions: [
				{
					name: "Remove from project",
					description: "Remove this item from the project",
					onClick: (entry) => {
						deleteThingFromProject(entry.id);
					},
				},
			],
		},
	];

	const onTableChange = ({ sort }: Criteria<IProjectEntry>) => {
		if (sort) {
			const { field: sortField, direction: sortDirection } = sort;
			assert(sortField !== "data");
			setSortField(sortField);
			setSortDirection(sortDirection);
		}
	};

	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header
				pageTitle={
					<>
						Project: {data.name} <OriginRepoIndicator metadata={data} />
					</>
				}
				description={<>Contains {things.length} items</>}
			/>
			<EuiPageTemplate.Section>
				<EuiFlexGroup gutterSize="m">
					<EuiFlexItem>
						<EuiFieldSearch
							fullWidth
							placeholder="Search..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</EuiFlexItem>
				</EuiFlexGroup>

				<EuiSpacer size="m" />
				<EuiInMemoryTable
					tableCaption="Contents of this project"
					items={thingsFiltered}
					columns={columns}
					sorting={{
						sort: {
							field: sortField,
							direction: sortDirection,
						},
					}}
					onChange={onTableChange}
				/>
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}
