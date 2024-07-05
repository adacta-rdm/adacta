import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect } from "@elastic/eui";
import React, { Suspense } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { FetchPolicy } from "relay-runtime";

import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { getTokenByType } from "../../utils/getTokenByType";
import { DateTime } from "../datetime/DateTime";
import { SearchableSuperSelect } from "../utils/SearchableSelect";

import type { SampleSelectionQuery } from "@/relay/SampleSelectionQuery.graphql";
import { createDate } from "~/lib/createDate";
import type { ISampleId } from "~/lib/database/Ids";

const SampleSelectionGraphQLQuery = graphql`
	query SampleSelectionQuery($repositoryId: ID!) {
		repository(id: $repositoryId) {
			samples {
				edges {
					node {
						id
						name
						metadata {
							creationTimestamp
							creator {
								name
							}
						}
						relatedSamples {
							__typename
						}
						relatedSamplesReverse {
							__typename
						}
					}
				}
			}
		}
	}
`;

interface IProps {
	valueOfSelected: string | undefined;
	onChange: (value: string | undefined) => void;

	fetchPolicy?: FetchPolicy | undefined;

	/**
	 * If this prop is set to an SampleId this component will assume that only Samples which could
	 * be put in a relationship with the given sample should be shown. For example the sample itself
	 * will not be shown as option or samples which are already in relationships won't be shown
	 */
	relationsForSample?: ISampleId;
}

// Wrapper to supply suspense fallback
export function SampleSelection(props: IProps) {
	return (
		<Suspense fallback={<EuiSuperSelect options={[]} isLoading={true} disabled={true} />}>
			<SampleSelectionPure {...props} />
		</Suspense>
	);
}

function SampleSelectionPure(props: IProps) {
	const { repository: data } = useLazyLoadQuery<SampleSelectionQuery>(
		SampleSelectionGraphQLQuery,
		useRepositoryIdVariable(),
		{ fetchPolicy: props.fetchPolicy }
	);

	const getComponentOptions = () => {
		const options = data.samples.edges.flatMap(({ node: sample }) => {
			// Filter out samples if relationsForSample is set:
			// - Filter samples with parents (to avoid multiple parents)
			// - Filter samples witch children (to avoid having to implement a proper loop detection)
			// - Filter the sample itself
			if (
				props.relationsForSample !== undefined &&
				(sample.relatedSamplesReverse.length > 0 ||
					sample.relatedSamples.length > 0 ||
					sample.id == props.relationsForSample)
			) {
				return [];
			}

			return {
				value: sample.id,
				label: sample.name,
				inputDisplay: (
					<>
						<EuiFlexGroup alignItems="center" direction="row">
							<EuiFlexItem grow={false}>{getTokenByType("Sample")}</EuiFlexItem>
							<EuiFlexItem>
								{sample.name}
								<br />
								Created by: {sample.metadata.creator.name} at{" "}
								{<DateTime date={createDate(sample.metadata.creationTimestamp)} />}
							</EuiFlexItem>
						</EuiFlexGroup>
					</>
				),
			};
		});

		return options;
	};

	return (
		<SearchableSuperSelect
			options={getComponentOptions()}
			value={props.valueOfSelected}
			onChangeValue={(value) => {
				props.onChange(value);
			}}
			fullWidth
			rowHeight={75}
		/>
	);
}
