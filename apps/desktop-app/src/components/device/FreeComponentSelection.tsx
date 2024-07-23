import assert from "assert";

import { EuiFlexGroup, EuiFlexItem, EuiImage } from "@elastic/eui";
import { assertDefined } from "@omegadot/assert";
import type { ReactNode } from "react";
import React from "react";
import { graphql, useLazyLoadQuery } from "react-relay";

import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { getTokenByType } from "../../utils/getTokenByType";
import { DateTime } from "../datetime/DateTime";
import { SearchableSuperSelect } from "../utils/SearchableSelect";

import type { PropertyType } from "@/relay/AddOrEditComponentUsageModalFragment.graphql";
import type { FreeComponentSelectionQuery } from "@/relay/FreeComponentSelectionQuery.graphql";
import { createDate, createIDatetime, createMaybeIDatetime } from "~/lib/createDate";

export const FreeComponentSelectionGraphQLQuery = graphql`
	query FreeComponentSelectionQuery(
		$deviceId: ID!
		$begin: DateTime!
		$end: DateTime
		$ignoreProperty: ID
		$repositoryId: ID!
	) {
		repository(id: $repositoryId) {
			device(id: $deviceId) {
				freeComponents(begin: $begin, end: $end, ignoreProperty: $ignoreProperty) {
					__typename
					... on Device {
						id
						name
						metadata {
							creator {
								name
							}
							creationTimestamp
						}
						definition {
							imageResource {
								dataURI
							}
						}
					}
					... on Sample {
						id
						name
						metadata {
							creator {
								name
							}
							creationTimestamp
						}
					}
				}
			}
		}
	}
`;

export function FreeComponentSelection(props: {
	deviceId: string;
	begin: Date;
	end?: Date;
	ignoreProperty?: string;
	type?: PropertyType;

	valueOfSelected: string | undefined;
	onChange: (value: string | undefined) => void;
}) {
	const { deviceId, begin, end, ignoreProperty, type } = props;
	const { repository: data } = useLazyLoadQuery<FreeComponentSelectionQuery>(
		FreeComponentSelectionGraphQLQuery,
		{
			deviceId,
			begin: createIDatetime(begin),
			end: createMaybeIDatetime(end),
			ignoreProperty,
			...useRepositoryIdVariable(),
		},
		{
			// Set fetchPolicy to "network-only" to ensure that the available options aren't based
			// on stale data (i.e. it is possible to create a new device within the
			// AddOrEditComponentUsageModal or the SwapComponentModal)
			fetchPolicy: "network-only",
		}
	);

	const mapValueToReactNode: Record<string, ReactNode> = {};

	/**
	 * Returns the possible dropdown options (Devices/Samples) for the selected slot
	 * @param type of the components which should be shown (i.e. Device or Sample)
	 */
	const getComponentOptions = (type: PropertyType | undefined) => {
		assertDefined(data.device);
		return data.device.freeComponents.flatMap((c) => {
			assert(c.__typename !== "%other");

			// Return nothing if the type does not match the requested type
			if (type !== c.__typename && type !== undefined) {
				return [];
			}
			return {
				value: c.id,
				label: c.name,
				inputDisplay: (
					<>
						<EuiFlexGroup alignItems="center" direction="row">
							<EuiFlexItem grow={false}>
								{c.__typename === "Device" && c.definition?.imageResource[0]?.dataURI ? (
									<EuiImage
										style={{ marginRight: 10 }}
										size={45}
										alt={`${c.name} preview`}
										src={c.definition?.imageResource[0]?.dataURI}
									/>
								) : (
									getTokenByType(c.__typename)
								)}
							</EuiFlexItem>
							<EuiFlexItem>
								{c.name}
								<br />
								Created by: {c.metadata.creator.name} at{" "}
								{<DateTime date={createDate(c.metadata.creationTimestamp)} />}
							</EuiFlexItem>
						</EuiFlexGroup>
					</>
				),
			};
		});
	};

	return (
		<SearchableSuperSelect
			options={getComponentOptions(type)}
			value={props.valueOfSelected}
			placeholder={"Select a Device/Sample"}
			onChangeValue={props.onChange}
			renderOption={(option) => {
				if (option.value) {
					return mapValueToReactNode[option.value];
				}
			}}
			fullWidth
			rowHeight={75}
		/>
	);
}
