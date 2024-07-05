import { isNonNullish } from "@omegadot/assert";
import lodash from "lodash";
import { useMemo } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";

import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { connectionToArray } from "../../utils/connectionToArray";

import type { SpecificationKeyProviderDeviceQuery } from "@/relay/SpecificationKeyProviderDeviceQuery.graphql";
import type { SpecificationKeyProviderSampleQuery } from "@/relay/SpecificationKeyProviderSampleQuery.graphql";

export function useSampleSpecificationKeys() {
	const variable = useRepositoryIdVariable();
	const { repository: data } = useLazyLoadQuery<SpecificationKeyProviderSampleQuery>(
		graphql`
			query SpecificationKeyProviderSampleQuery($repositoryId: ID!) {
				repository(id: $repositoryId) {
					samples {
						edges {
							node {
								specifications {
									name
								}
							}
						}
					}
				}
			}
		`,
		variable
	);

	return useMemo(() => {
		const keys = data.samples.edges
			.map((e) => e.node?.specifications)
			.flat()
			.map((s) => s?.name);

		const filteredKeys = lodash.sortedUniq(keys.filter(isNonNullish).sort());
		return filteredKeys;
	}, [variable.repositoryId, data]);
}

export function useDeviceSpecificationKeys() {
	const variable = useRepositoryIdVariable();
	const { repository: data } = useLazyLoadQuery<SpecificationKeyProviderDeviceQuery>(
		graphql`
			query SpecificationKeyProviderDeviceQuery($repositoryId: ID!) {
				repository(id: $repositoryId) {
					# Get all device definitions (for specifications on definitions)
					deviceDefinitions {
						edges {
							node {
								specifications {
									name
								}
							}
						}
					}

					# Get all devices (for specifications on devices)
					devices {
						edges {
							node {
								specifications {
									name
								}
							}
						}
					}
				}
			}
		`,
		variable
	);

	return useMemo(() => {
		const propertyKeysFromDevices = data.devices.edges
			.map((e) => e.node?.specifications)
			.flat()
			.map((s) => s?.name);

		const propertyKeysFromDeviceDefinitions = connectionToArray(data.deviceDefinitions)
			.map((e) => e.specifications)
			.flat()
			.map((s) => s.name);

		const keys = propertyKeysFromDevices.concat(propertyKeysFromDeviceDefinitions);
		return lodash.sortedUniq(keys.filter(isNonNullish).sort());
	}, [data]);
}
