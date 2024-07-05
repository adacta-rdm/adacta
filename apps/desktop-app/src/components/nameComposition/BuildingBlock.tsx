import { EuiBadge, EuiBadgeGroup, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from "@elastic/eui";
import React from "react";
import { useRefetchableFragment, useSubscribeToInvalidationState } from "react-relay";
import { graphql } from "relay-runtime";

import type { IUpdateExistingConstant } from "./UpsertConstant";
import type { IUpdateExistingVariable } from "./UpsertVariable";

import type { BuildingBlock$data, BuildingBlock$key } from "@/relay/BuildingBlock.graphql";
import type { BuildingBlockConstant$data } from "@/relay/BuildingBlockConstant.graphql";
import type { BuildingBlockVariable$data } from "@/relay/BuildingBlockVariable.graphql";

type OnEdit =
	| {
			type: "variable";
			value: IUpdateExistingVariable;
	  }
	| {
			type: "constant";
			value: IUpdateExistingConstant;
	  };

export function BuildingBlock(props: {
	data: BuildingBlock$key;
	isDragging?: boolean;
	onEdit?: (v: OnEdit) => void;
	onDelete?: (id: string) => void;

	forceShowDelete?: boolean;
}) {
	graphql`
		fragment BuildingBlockVariable on NameCompositionVariableVariable {
			__typename
			id
			name
			alias
			prefix
			suffix
		}
	`;

	graphql`
		fragment BuildingBlockConstant on NameCompositionVariableConstant {
			__typename
			id
			name
		}
	`;

	const [_data, refetch] = useRefetchableFragment(
		graphql`
			fragment BuildingBlock on NameCompositionVariable
			@refetchable(queryName: "BuildingBlockRefetchQuery") {
				deletable
				...BuildingBlockVariable @relay(mask: false)
				...BuildingBlockConstant @relay(mask: false)
			}
		`,
		props.data
	);

	// Generated types are not correct (https://github.com/facebook/relay/issues/4439)
	const data = _data as unknown as (BuildingBlockVariable$data | BuildingBlockConstant$data) &
		Pick<BuildingBlock$data, "deletable">;

	const type = data.__typename;
	const aliases = type === "NameCompositionVariableVariable" ? data.alias : [];

	useSubscribeToInvalidationState([data.id], () => {
		refetch({});
	});

	return (
		<EuiFlexGroup direction={"column"}>
			<EuiFlexGroup>
				<EuiFlexItem>{data.name}</EuiFlexItem>
				{props.onEdit && (
					<EuiFlexItem grow={false}>
						<EuiButtonIcon
							iconType={"pencil"}
							aria-label={"Edit"}
							onClick={() => {
								if (props.onEdit) {
									if (data.__typename === "NameCompositionVariableVariable") {
										props.onEdit({
											type: "variable",
											value: {
												id: data.id,
												name: data.name,
												alias: [...data.alias],
												prefix: data.prefix ?? undefined,
												suffix: data.suffix ?? undefined,
											},
										});
									} else if (data.__typename === "NameCompositionVariableConstant") {
										props.onEdit({
											type: "constant",
											value: { id: data.id, name: data.name, value: data.name },
										});
									}
								}
							}}
						/>
					</EuiFlexItem>
				)}
				<EuiFlexItem grow={false}>
					<EuiButtonIcon
						aria-label={"Delete"}
						iconType={"cross"}
						disabled={!(data.deletable || props.forceShowDelete)}
						onClick={() => {
							if (data.deletable || props.forceShowDelete) {
								props?.onDelete && props.onDelete(data.id);
							}
						}}
					/>
				</EuiFlexItem>
			</EuiFlexGroup>

			<EuiFlexItem>
				<EuiBadgeGroup>
					{data.__typename === "NameCompositionVariableVariable" && data.prefix && (
						<EuiBadge color={"hollow"}>{data.prefix}</EuiBadge>
					)}
					{aliases.map((alias, i) => (
						<>
							<EuiBadge key={alias}>{alias}</EuiBadge>
							{i !== aliases.length - 1 && (
								<EuiBadge color={"hollow"} style={{ paddingInline: 3 }}>
									|
								</EuiBadge>
							)}
						</>
					))}
					{data.__typename === "NameCompositionVariableVariable" && data.suffix && (
						<EuiBadge color={"hollow"}>{data.suffix}</EuiBadge>
					)}
				</EuiBadgeGroup>
			</EuiFlexItem>
		</EuiFlexGroup>
	);
}
