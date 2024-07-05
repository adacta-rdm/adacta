import { Suspense } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";

import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { SearchableSelect, SearchableSelectLoading } from "../utils/SearchableSelect";

import type { DeviceSelectionQuery } from "@/relay/DeviceSelectionQuery.graphql";

interface IProps {
	deviceId: string | undefined;
	onChange: (deviceId: string | undefined) => void;
}

/**
 * Note: This component is used to select a device from the full list of devices.
 * It is used by the preset management
 * It is not used when the user is asked to assign a column to a device in the ImportWizard
 */
export function DeviceSelection(props: IProps) {
	return (
		<Suspense fallback={<SearchableSelectLoading />}>
			<DeviceSelectionCore {...props} />
		</Suspense>
	);
}

function DeviceSelectionCore(props: IProps) {
	const repositoryIdVariable = useRepositoryIdVariable();
	const data = useLazyLoadQuery<DeviceSelectionQuery>(
		graphql`
			query DeviceSelectionQuery($repositoryId: ID!) {
				repository(id: $repositoryId) {
					devices(first: 100) {
						edges {
							node {
								id
								displayName
							}
						}
					}
				}
			}
		`,
		repositoryIdVariable
	);

	return (
		<SearchableSelect
			options={data.repository.devices.edges
				.map((e) => e.node)
				.map((n) => ({ value: n.id, label: n.displayName }))}
			value={props.deviceId}
			onChangeValue={props.onChange}
		/>
	);
}
