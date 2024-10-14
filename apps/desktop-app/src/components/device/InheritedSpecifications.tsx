import {
	EuiButtonIcon,
	EuiDescriptionList,
	EuiFormRow,
	EuiLink,
	EuiSkeletonText,
	EuiText,
	EuiToolTip,
} from "@elastic/eui";
import React, { Suspense } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { useFragment } from "react-relay/hooks";

import type { InheritedSpecificationsQuery } from "@/relay/InheritedSpecificationsQuery.graphql";
import type { InheritedSpecificationsSample$key } from "@/relay/InheritedSpecificationsSample.graphql";
import { assertDefined } from "~/lib/assert/assertDefined";
import type { IDeviceDefinitionId } from "~/lib/database/Ids";
import type { ISpecification } from "~/lib/database/documents/interfaces/ISpecification";
import {
	convertDeviceToTraversalResult,
	convertSampleToTraversalResult,
} from "~/lib/inheritance/convertToTraversalResult";
import { deriveSpecifications } from "~/lib/inheritance/deriveSpecifications";
import type { ISpecificationTraversalResult } from "~/lib/inheritance/deriveSpecifications";

interface IPropsShared {
	baseSpecifications: ISpecification[];

	/**
	 * Called when the user wants to overwrite a specification from an ancestor device definition.
	 * @param name specification name
	 */
	onOverwriteInheritedSpecification?: (name: string) => void;
}

interface IDeviceProps {
	deviceDefinitions: IDeviceDefinitionId[];
	onClickSpecificationSource: (id: IDeviceDefinitionId) => void;
}

interface ISampleProps {
	sample: InheritedSpecificationsSample$key;
}

/**
 * Renders a list of inherited specifications for devices.
 */
export function InheritedSpecificationsDevice(props: IPropsShared & IDeviceProps) {
	return (
		<Suspense fallback={<InheritedSpecificationsLoading />}>
			<InheritedSpecificationsDeviceCore {...props} />
		</Suspense>
	);
}

/**
 * Renders a list of inherited specifications for samples
 */
export function InheritedSpecificationsSample(props: IPropsShared & ISampleProps) {
	return (
		<Suspense fallback={<InheritedSpecificationsLoading />}>
			<InheritedSpecificationsSampleCore {...props} />
		</Suspense>
	);
}

function InheritedSpecificationsSampleCore(props: IPropsShared & ISampleProps) {
	const data = useFragment(
		graphql`
			fragment InheritedSpecificationsSample on Sample {
				id
				specificationsCollected {
					# eslint-disable-next-line relay/unused-fields
					level
					sample {
						id
						name
						specifications {
							name
							value
						}
					}
				}
			}
		`,
		props.sample
	);

	const specifications = deriveSpecifications(
		convertSampleToTraversalResult(
			props.baseSpecifications,
			// Filter our "own" specifications as they should be replaced/overwritten by the specifications in baseSpecifications
			data.specificationsCollected.filter((s) => s.sample.id !== data.id),
			false
		),
		true
	);

	return (
		<SpecificationList
			onOverwriteInheritedSpecification={props.onOverwriteInheritedSpecification}
			specifications={specifications}
		/>
	);
}

function InheritedSpecificationsDeviceCore(props: IPropsShared & IDeviceProps) {
	const data = useLazyLoadQuery<InheritedSpecificationsQuery>(
		graphql`
			query InheritedSpecificationsQuery($simulatedParentId: [ID!]!) {
				deviceDefinitionsTree(simulatedParentId: $simulatedParentId) {
					# eslint-disable-next-line relay/unused-fields
					definition {
						id
						name
						specifications {
							name
							value
						}
					}
					# eslint-disable-next-line relay/unused-fields
					level
				}
			}
		`,
		{ simulatedParentId: props.deviceDefinitions }
	);

	const { onClickSpecificationSource, baseSpecifications } = props;
	const { deviceDefinitionsTree } = data;

	const deviceDefinitionSpecifications = convertDeviceToTraversalResult(
		baseSpecifications,
		deviceDefinitionsTree, // Fill this with the parent definitions of the device
		false
	);
	const specifications = deriveSpecifications(deviceDefinitionSpecifications, true);

	return (
		<SpecificationList
			onOverwriteInheritedSpecification={props.onOverwriteInheritedSpecification}
			onClickOnSpecificationSource={onClickSpecificationSource}
			specifications={specifications}
		/>
	);
}

function SpecificationList(props: {
	specifications: ISpecificationTraversalResult[];

	onClickOnSpecificationSource?: (id: IDeviceDefinitionId) => void;
	onOverwriteInheritedSpecification?: (name: string) => void;
}) {
	const { onClickOnSpecificationSource, specifications } = props;

	const Specification = ({ specification }: { specification: ISpecificationTraversalResult }) => {
		// Render source of specification (either a clickable link to a DeviceDefinition or regular
		// text for samples
		const specificationSource = onClickOnSpecificationSource ? (
			<EuiLink
				style={specification.skipped ? { textDecoration: "line-through" } : {}}
				onClick={() => {
					assertDefined(specification.source);
					onClickOnSpecificationSource(specification.source.id as IDeviceDefinitionId);
				}}
			>
				{specification.source?.name}
			</EuiLink>
		) : (
			specification.source?.name
		);

		const specificationValueWithSource = (
			<>
				<>{specification.value == "" ? <i>&lsaquo;empty value&rsaquo;</i> : specification.value}</>{" "}
				({specificationSource})
			</>
		);

		return specification.skipped ? (
			<EuiText color={"subdued"}>
				<s>{specificationValueWithSource}</s>{" "}
				<EuiToolTip
					content={
						"This value is overwritten either by a different device definition or the device itself"
					}
				>
					<EuiButtonIcon iconType={"questionInCircle"} disabled={true} />
				</EuiToolTip>
			</EuiText>
		) : (
			<>
				{specificationValueWithSource}{" "}
				{props.onOverwriteInheritedSpecification && (
					<EuiButtonIcon
						aria-label={"Overwrite inherited specification"}
						iconType={"plus"}
						onClick={() => {
							assertDefined(props.onOverwriteInheritedSpecification);
							props.onOverwriteInheritedSpecification(specification.name);
						}}
					/>
				)}
			</>
		);
	};

	if (specifications.length == 0) {
		return null;
	}

	return (
		<EuiFormRow label={"Inherited specifications"} fullWidth>
			<EuiDescriptionList
				type={"column"}
				listItems={specifications.map((s) => ({
					title: s.name,
					description: <Specification specification={s} />,
				}))}
			/>
		</EuiFormRow>
	);
}

/**
 * Generic loading state used for inherited specifications (for Devices and Samples)
 */
function InheritedSpecificationsLoading() {
	return (
		<EuiFormRow label={"Inherited specifications"} fullWidth>
			<EuiDescriptionList
				type={"column"}
				listItems={new Array(5).map(() => ({
					title: <EuiSkeletonText lines={1} />,
					description: <EuiSkeletonText lines={1} />,
				}))}
			/>
		</EuiFormRow>
	);
}
