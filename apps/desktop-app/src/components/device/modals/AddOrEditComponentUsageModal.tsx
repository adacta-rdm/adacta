import assert from "assert";

import {
	EuiButton,
	EuiButtonEmpty,
	EuiCallOut,
	EuiFlexGroup,
	EuiFlexItem,
	EuiFormRow,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
	EuiSpacer,
	EuiSuperSelect,
	EuiSwitch,
} from "@elastic/eui";
import { assertDefined } from "@omegadot/assert";
import type { Moment } from "moment";
import moment from "moment";
import React, { Suspense, useEffect, useState } from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { DatePicker } from "../../datepicker/DatePicker";
import { DateTime } from "../../datetime/DateTime";
import { FreeComponentSelection } from "../FreeComponentSelection";
import { SlotSelection } from "../SlotSelection";

import type { AddOrEditComponentUsageModalFragment$key } from "@/relay/AddOrEditComponentUsageModalFragment.graphql";
import { DeviceAdd } from "~/apps/desktop-app/src/components/device/DeviceAdd";
import type { IPropertyDefinition } from "~/lib/interface/IPropertyDefinition";

const AddOrEditComponentUsageModalGraphQLFragment = graphql`
	fragment AddOrEditComponentUsageModalFragment on Device {
		definition {
			propertyDefinitions {
				name
				type
			}
		}
		properties {
			id
			name
			timestamp
			timestampEnd
		}
	}
`;

export interface IExistingProperty {
	propertyId: string;
	begin: Date;
	end?: Date;
	slot: string;
	component: string;
}

interface IProps {
	deviceId: string;
	isLoading: boolean;

	// Properties for editing an existing property
	existingProperty?: IExistingProperty;

	device: AddOrEditComponentUsageModalFragment$key;

	onClose: () => void;
	onSubmit: (componentID: string, name: string, begin: Date, end?: Date) => void;
}

export function AddOrEditComponentUsageModal(props: IProps) {
	let initialBegin: Date;
	let initialEnd: Date | undefined;

	if (!props.existingProperty) {
		initialBegin = new Date();
		initialEnd = undefined;
	} else {
		initialBegin = props.existingProperty.begin;
		initialEnd = props.existingProperty.end;
	}

	const initialData = useFragment(AddOrEditComponentUsageModalGraphQLFragment, props.device);

	const [begin, setBegin] = useState(initialBegin);
	// This is two separate variables to be able to preserve the end date after a switch of
	// `isOpenEnd` from on to off
	const [end, setEnd] = useState(initialEnd ?? new Date(Date.now() + 24 * 60 * 60 * 1000));
	const [isOpenEnd, setIsOpenEnd] = useState(initialEnd == undefined);
	const [showCreateDeviceModal, setShowCreateDeviceModal] = useState(false);

	const data = initialData;

	const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>(
		props.existingProperty?.component
	);

	const [propertyName, setPropertyName] = useState<string>(props.existingProperty?.slot ?? "");

	const [invalidDateRange, setInvalidDateRange] = useState<[Date, Date] | null>(null);
	const dateRangeInvalid =
		invalidDateRange !== null || (end !== undefined && begin >= end && !isOpenEnd);

	useEffect(() => {
		const getExcludedDates = (): [Date, Date | null][] => {
			assert(data !== null, "Test");
			if (!propertyName) return [];
			const properties = data.properties.filter(
				(p) => p.name === propertyName && p.id !== props.existingProperty?.propertyId
			);
			if (properties.length === 0) return [];
			return properties.map((p) => [
				new Date(p.timestamp),
				p.timestampEnd ? new Date(p.timestampEnd) : null,
			]);
		};

		const validateDateRange = () => {
			for (const [excludedBegin, excludedEnd] of getExcludedDates()) {
				if ((isOpenEnd || end > excludedBegin) && (excludedEnd === null || begin < excludedEnd)) {
					setInvalidDateRange([excludedBegin, excludedEnd ?? new Date()]);
					return;
				}
			}
			setInvalidDateRange(null);
		};

		validateDateRange();
	}, [
		begin,
		end,
		propertyName,
		data?.properties,
		isOpenEnd,
		data,
		props.existingProperty?.propertyId,
	]);

	if (data === null) {
		return null;
	}

	const generateTimestamps = () => {
		const timestamps: Moment[] = [];
		for (let i = 0; i < 24; i++) {
			for (let j = 0; j < 60; j += 10) {
				timestamps.push(moment().hours(i).minutes(j));
			}
		}
		return timestamps;
	};

	const submit = () => {
		assertDefined(selectedComponentId);
		props.onSubmit(selectedComponentId, propertyName, begin, isOpenEnd ? undefined : end);
	};

	// Get the type of the currently selected slot. Can be undefined if slot name is newly created
	const selectedSlotType = data.definition.propertyDefinitions.find(
		(d) => d.name === propertyName
	)?.type;

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
				<EuiModalHeaderTitle>
					{props.existingProperty === undefined ? "Add" : "Edit"} component usage
				</EuiModalHeaderTitle>
			</EuiModalHeader>
			<EuiModalBody>
				<EuiFormRow
					fullWidth
					label="Slot"
					helpText={"Select a slot from the the list. A new slot can be created by entering text."}
				>
					<SlotSelection
						propertyDefinitions={data.definition.propertyDefinitions as IPropertyDefinition[]}
						value={propertyName}
						onChange={setPropertyName}
						editMode={props.existingProperty !== undefined}
					/>
				</EuiFormRow>
				{invalidDateRange !== null && (
					<>
						<EuiSpacer />
						<EuiCallOut color="danger">
							The selected date range overlaps with a date range where another component is
							installed in the selected slot:
							<br />
							{<DateTime date={invalidDateRange[0]} />} - {<DateTime date={invalidDateRange[1]} />}
						</EuiCallOut>
						<EuiSpacer />
					</>
				)}
				<EuiFormRow fullWidth label="Installation date">
					<DatePicker
						fullWidth
						showTimeSelect
						value={begin}
						onChange={(date) => {
							setBegin(date);
						}}
						adjustDateOnChange={false}
						injectTimes={generateTimestamps()}
						isInvalid={dateRangeInvalid}
					/>
				</EuiFormRow>
				<EuiFormRow fullWidth label="Not removed yet">
					<EuiSwitch
						label={"Is the component still installed?"}
						checked={isOpenEnd}
						onChange={(e) => {
							setIsOpenEnd(e.target.checked);
						}}
					/>
				</EuiFormRow>
				<EuiFormRow fullWidth label="Removal date">
					<DatePicker
						fullWidth
						disabled={isOpenEnd}
						showTimeSelect
						value={end}
						onChange={(date) => {
							setEnd(date);
						}}
						injectTimes={generateTimestamps()}
						isInvalid={dateRangeInvalid}
					/>
				</EuiFormRow>

				<EuiFormRow fullWidth label="Component">
					<EuiFlexGroup>
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
							<EuiFlexItem>
								<FreeComponentSelection
									deviceId={props.deviceId}
									begin={begin}
									end={isOpenEnd ? undefined : end}
									type={selectedSlotType}
									ignoreProperty={props.existingProperty?.propertyId}
									valueOfSelected={selectedComponentId}
									onChange={(value) => setSelectedComponentId(value)}
								/>
							</EuiFlexItem>
						</Suspense>
						<EuiFlexItem grow={false}>
							<EuiButton onClick={() => setShowCreateDeviceModal(true)}>Add Device</EuiButton>
						</EuiFlexItem>
					</EuiFlexGroup>
				</EuiFormRow>
			</EuiModalBody>
			<EuiModalFooter>
				<EuiButtonEmpty onClick={props.onClose} isDisabled={props.isLoading}>
					Cancel
				</EuiButtonEmpty>
				<EuiButton
					fill
					onClick={submit}
					disabled={!selectedComponentId || !propertyName || dateRangeInvalid}
					isLoading={props.isLoading}
				>
					{props.existingProperty === undefined ? "Add" : "Save"} usage
				</EuiButton>
			</EuiModalFooter>
		</EuiModal>
	);
}
