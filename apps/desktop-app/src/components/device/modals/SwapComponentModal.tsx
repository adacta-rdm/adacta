import assert from "assert";

import {
	EuiButton,
	EuiButtonEmpty,
	EuiFlexGroup,
	EuiFlexItem,
	EuiFormRow,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
	EuiSuperSelect,
	EuiText,
} from "@elastic/eui";
import React, { Suspense, useState } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { useRepositoryIdVariable } from "../../../services/router/UseRepoId";
import { DatePicker } from "../../datepicker/DatePicker";
import { DateTime } from "../../datetime/DateTime";
import { SampleLink } from "../../sample/SampleLink";
import { DeviceLink } from "../DeviceLink";

import type { SwapComponentModalModalFragment$key } from "@/relay/SwapComponentModalModalFragment.graphql";
import type { SwapComponentModalMutation } from "@/relay/SwapComponentModalMutation.graphql";
import type { SwapComponentModalQuery } from "@/relay/SwapComponentModalQuery.graphql";
import { DeviceAdd } from "~/apps/desktop-app/src/components/device/DeviceAdd";
import { FreeComponentSelection } from "~/apps/desktop-app/src/components/device/FreeComponentSelection";
import { assertDefined } from "~/lib/assert/assertDefined";
import {
	createDate,
	createIDatetime,
	createMaybeDate,
	createMaybeIDatetime,
} from "~/lib/createDate";

const SwapComponentGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation SwapComponentModalMutation(
		$repositoryId: ID!
		$input: SwapComponentInput!
		$time: DateTime
	) {
		repository(id: $repositoryId) {
			swapComponent(input: $input) {
				...DeviceOverview @arguments(time: $time)
			}
		}
	}
`;

const SwapComponentModalGraphQLFragment = graphql`
	fragment SwapComponentModalModalFragment on Device {
		properties {
			id
			timestamp
			timestampEnd
			value {
				__typename
				... on Sample {
					...SampleLink
				}
				... on Device {
					...DeviceLink
				}
			}
		}
	}
`;

interface IProps {
	viewTimestamp?: Date;
	viewDeviceId: string; // DeviceId of the device which is viewed while this modal is open

	device: SwapComponentModalModalFragment$key;

	deviceId: string;
	propertyId: string;

	onClose: () => void;
}

export function SwapComponentModalLazy(props: Omit<IProps, "device">) {
	const query = graphql`
		query SwapComponentModalQuery($repositoryId: ID!, $deviceId: ID!) {
			repository(id: $repositoryId) {
				device(id: $deviceId) {
					...SwapComponentModalModalFragment
				}
			}
		}
	`;
	const { repository: data } = useLazyLoadQuery<SwapComponentModalQuery>(query, {
		...useRepositoryIdVariable(),
		deviceId: props.deviceId,
	});
	return <SwapComponentModal device={data.device} {...props} />;
}

function SwapComponentModal(props: IProps) {
	type EndType = "currentEnd" | "untilNow" | "manualInput";
	const device = useFragment(SwapComponentModalGraphQLFragment, props.device);
	const property = device.properties.find((p) => p.id === props.propertyId);
	assertDefined(property, "Unknown property");
	assert(property.value.__typename !== "%other");

	const [swapTime, setSwapTime] = useState(new Date());
	const [componentId, setComponentId] = useState<string | undefined>(undefined);
	const [showCreateDeviceModal, setShowCreateDeviceModal] = useState(false);

	// End time config
	const endTimeOptions: { value: EndType; inputDisplay: string | JSX.Element }[] = [
		{
			value: "currentEnd",
			inputDisplay: (
				<>
					Keep current removal date (
					<DateTime undefinedMeansNow date={createMaybeDate(property.timestampEnd)} />)
				</>
			),
		},
		{ value: "manualInput", inputDisplay: "Select a time" },
	];

	if (property.timestampEnd !== null) {
		endTimeOptions.push({ value: "untilNow", inputDisplay: "Installed until now" });
	}

	const [endTimeMode, setEndTimeMode] = useState<EndType>("currentEnd");
	const [userEnteredEndTime, setUserEnteredEndTime] = useState(
		createMaybeDate(property.timestampEnd) ?? new Date()
	);

	const [swapComponentMutation, inFlight] = useMutation<SwapComponentModalMutation>(
		SwapComponentGraphQLMutation
	);

	const repositoryIdVariable = useRepositoryIdVariable();
	const swapMutation = (newComponentId: string, swapTime: Date, endDate: Date | undefined) => {
		swapComponentMutation({
			variables: {
				input: {
					returnedDeviceId: props.viewDeviceId,
					propertyId: props.propertyId,
					componentId: newComponentId,
					swapTime: createIDatetime(swapTime),
					newPropertyEndTime: createMaybeIDatetime(endDate),
				},
				time: createMaybeIDatetime(props.viewTimestamp),
				...repositoryIdVariable,
			},
			onCompleted: props.onClose,
			updater: (cache) => {
				cache.invalidateStore();
			},
		});
	};

	const propertyInfo = (
		<>
			{property.value.__typename === "Device" ? (
				<DeviceLink data={property.value} />
			) : (
				<SampleLink sample={property.value} />
			)}{" "}
			(installed from <DateTime date={createDate(property.timestamp)} /> -{" "}
			<DateTime undefinedMeansNow date={createMaybeDate(property.timestampEnd)} />)
		</>
	);

	// In the state an "undefined" end date stays undefined.
	// Only for the validation we replace the "undefined" with the current time to avoid stale
	// dates after changes
	const userEnteredEndTimeOrNow = userEnteredEndTime ?? new Date();
	const swapDateInvalid =
		swapTime > userEnteredEndTimeOrNow ||
		swapTime <= createDate(property.timestamp) ||
		(property.timestampEnd !== null && swapTime >= createDate(property.timestampEnd));

	const endDateInvalid =
		swapTime > userEnteredEndTimeOrNow ||
		userEnteredEndTimeOrNow <= createDate(property.timestamp) ||
		(property.timestampEnd !== null && userEnteredEndTimeOrNow > createDate(property.timestampEnd));

	if (showCreateDeviceModal) {
		return (
			<DeviceAdd
				closeModal={() => setShowCreateDeviceModal(false)}
				connections={{ connectionIdFlat: [], connectionIdHierarchical: [] }}
			/>
		);
	}

	return (
		<EuiModal maxWidth={"90vw"} onClose={props.onClose} style={{ minWidth: "600px" }}>
			<EuiModalHeader>
				<EuiModalHeaderTitle>Swap component</EuiModalHeaderTitle>
			</EuiModalHeader>
			<EuiModalBody>
				<>
					<EuiFormRow label={"Time of the swap"} fullWidth>
						<DatePicker value={swapTime} onChange={setSwapTime} isInvalid={swapDateInvalid} />
					</EuiFormRow>
					<EuiFormRow label={"Component which gets swapped out"} fullWidth>
						<EuiText size={"s"}>{propertyInfo}</EuiText>
					</EuiFormRow>
					<EuiFormRow label={"Component which gets swapped in"} fullWidth>
						<EuiFlexGroup>
							<EuiFlexItem>
								<Suspense
									fallback={
										<EuiSuperSelect
											options={[]}
											valueOfSelected={undefined}
											onChange={() => {}}
											hasDividers
											fullWidth
											disabled={true}
											isLoading={true}
										/>
									}
								>
									<FreeComponentSelection
										type={property.value.__typename}
										deviceId={props.deviceId}
										begin={swapTime}
										end={createMaybeDate(property.timestampEnd)}
										valueOfSelected={componentId}
										onChange={(e) => setComponentId(e)}
									/>
								</Suspense>
							</EuiFlexItem>
							<EuiFlexItem grow={false}>
								<EuiButton onClick={() => setShowCreateDeviceModal(true)}>Add Device</EuiButton>
							</EuiFlexItem>
						</EuiFlexGroup>
					</EuiFormRow>
					<EuiFormRow label={"Swapped in component is installed until"} fullWidth>
						<EuiSuperSelect
							fullWidth
							options={endTimeOptions}
							valueOfSelected={endTimeMode}
							onChange={(value) => setEndTimeMode(value)}
						/>
					</EuiFormRow>
					{endTimeMode === "manualInput" && (
						<EuiFormRow label={"Time the component gets removed"} fullWidth>
							<DatePicker
								value={userEnteredEndTime}
								onChange={(e) => setUserEnteredEndTime(e)}
								isInvalid={endDateInvalid}
							/>
						</EuiFormRow>
					)}
				</>
			</EuiModalBody>
			<EuiModalFooter>
				<EuiButtonEmpty onClick={props.onClose} isDisabled={inFlight}>
					Cancel
				</EuiButtonEmpty>
				<EuiButton
					fill
					onClick={() => {
						let endDate: undefined | Date;
						switch (endTimeMode) {
							case "currentEnd":
								endDate = createMaybeDate(property.timestampEnd);
								break;
							case "untilNow":
								endDate = undefined;
								break;
							case "manualInput":
								endDate = userEnteredEndTime;
						}
						assertDefined(componentId);
						swapMutation(componentId, swapTime, endDate);
					}}
					disabled={swapDateInvalid || endDateInvalid || componentId === undefined}
					isLoading={inFlight}
				>
					Swap
				</EuiButton>
			</EuiModalFooter>
		</EuiModal>
	);
}
