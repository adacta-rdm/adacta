import assert from "assert";

import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect, EuiToolTip } from "@elastic/eui";
import type { EuiSuperSelectOption } from "@elastic/eui/src/components/form/super_select/super_select_control";
import type { UnitKind } from "@omegadot/einheiten/dist/types/quantities/kind";
import lodash from "lodash-es";
import React from "react";
import { graphql, useLazyLoadQuery } from "react-relay";

import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { getTokenByType } from "../../utils/getTokenByType";
import {
	ComponentNodeTreeProvider,
	useTree,
} from "../componentNodeTreeProvider/ComponentNodeTreeProvider";

import type {
	ImportDeviceSelectionQuery,
	ImportDeviceSelectionQuery$data,
} from "@/relay/ImportDeviceSelectionQuery.graphql";
import { assertDefined } from "~/lib/assert/assertDefined";
import { createIDatetime, createMaybeIDatetime } from "~/lib/createDate";
import type { IDeviceId } from "~/lib/database/Ids";

/**
 * Component used when imported data needs to be associated with a device.
 */
const ImportDeviceSelectionGraphQLQuery = graphql`
	query ImportDeviceSelectionQuery($deviceId: ID!, $timeFrame: TimeFrameInput, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			device(id: $deviceId) {
				id
				name
				displayName
				definition {
					acceptsUnit
				}

				...ComponentNodeTreeProviderFragment @arguments(timeFrame: $timeFrame)
				components(timeFrame: $timeFrame, includeOverlaps: true) {
					component {
						... on Device {
							id
							definition {
								acceptsUnit
							}
						}
					}
				}
			}
		}
	}
`;

interface IProps {
	deviceId: string;
	begin: Date;
	end?: Date;

	acceptsUnit?: UnitKind | "";

	pathOfSelectedDevice?: string[];
	onChange: (path: string[], id: IDeviceId) => void;

	readOnly?: boolean;
	disabled?: boolean | string; // If string, the string is displayed as a tooltip
}

const PATH_DELIMITER = "__ADACTA_PATH_DELIMITER__";

// Used to identify the root device (in this case the device the data is imported to) in the
// dropdown. All other devices are identified by their path from the root device (which is not
// feasible for the root device itself)
export const ROOT_DEVICE_MARKER = "__ROOT__";

export function ImportDeviceSelection(props: IProps) {
	const { deviceId, begin, end } = props;
	const data = useLazyLoadQuery<ImportDeviceSelectionQuery>(ImportDeviceSelectionGraphQLQuery, {
		deviceId,
		timeFrame: { begin: createIDatetime(begin), end: createMaybeIDatetime(end) },
		...useRepositoryIdVariable(),
	});

	if (data.repository.device === null) {
		return null;
	}

	return (
		<ComponentNodeTreeProvider device={data.repository.device}>
			<ImportDeviceSelectionPure {...props} data={data} />
		</ComponentNodeTreeProvider>
	);
}

function ImportDeviceSelectionPure(props: IProps & { data: ImportDeviceSelectionQuery$data }) {
	const { components } = useTree();

	// Insert the root device into the list of components
	const { device: rootDevice } = props.data.repository;
	components.push({
		component: {
			__typename: "Device",
			id: rootDevice.id,
			displayName: rootDevice.displayName,
			name: rootDevice.name,
			usagesAsProperty: [],
			definition: { acceptsUnit: rootDevice.definition.acceptsUnit },
		},
		pathFromTopLevelDevice: [ROOT_DEVICE_MARKER],
	});

	const { acceptsUnit } = props;

	const getDeviceOptions = (): EuiSuperSelectOption<string>[] => {
		return components.flatMap((c) => {
			if (
				c.component.__typename === "%other" ||
				c.component.__typename === "Sample" ||
				c.component.__typename === "virtualGroup"
			) {
				return [];
			}

			const componentAcceptsUnit = c.component.definition?.acceptsUnit;
			if (acceptsUnit !== undefined && componentAcceptsUnit !== undefined) {
				if (!componentAcceptsUnit.includes(acceptsUnit)) {
					return [];
				}
			}

			return {
				value: c.pathFromTopLevelDevice.join(PATH_DELIMITER),
				inputDisplay: c.component.displayName,
				dropdownDisplay: (
					<EuiFlexGroup alignItems="center" direction="row">
						<EuiFlexItem grow={false}>{getTokenByType(c.component.__typename)}</EuiFlexItem>
						<EuiFlexItem>{c.component.displayName}</EuiFlexItem>
					</EuiFlexGroup>
				),
			};
		});
	};

	const valueOfSelectedString = props.pathOfSelectedDevice
		? props.pathOfSelectedDevice.length === 0 // Empty array indicates the root device (the device at the top level)
			? ROOT_DEVICE_MARKER
			: props.pathOfSelectedDevice.join(PATH_DELIMITER)
		: undefined; // Undefined for no selection

	const select = (
		<EuiSuperSelect
			options={getDeviceOptions()}
			valueOfSelected={valueOfSelectedString}
			onChange={(id) => {
				let path = id.split(PATH_DELIMITER);

				const componentByPath = components.find((c) =>
					lodash.isEqual(c.pathFromTopLevelDevice, path)
				);

				if (path[0] == ROOT_DEVICE_MARKER) {
					path = [];
				}

				assertDefined(componentByPath, "Error while resolving devicePath to deviceId");
				assert(
					componentByPath?.component.__typename !== "%other" &&
						componentByPath.component.__typename !== "virtualGroup"
				);

				props.onChange(path, componentByPath.component.id as IDeviceId);
			}}
			hasDividers
			fullWidth
			disabled={typeof props.disabled === "string" || props.disabled}
			readOnly={props.readOnly}
		/>
	);

	if (typeof props.disabled === "string") {
		return <EuiToolTip content={props.disabled}>{select}</EuiToolTip>;
	}

	return select;
}
