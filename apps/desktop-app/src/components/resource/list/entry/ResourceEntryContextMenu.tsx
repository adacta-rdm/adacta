import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from "@elastic/eui";
import { assertDefined } from "@omegadot/assert";
import React, { useState } from "react";

import type { PropsWithConnections } from "../../../../interfaces/PropsWithConnections";
import { DeleteResource } from "../../DeleteResource";
import { ResourceFileDownloadButton } from "../../ResourceFileDownloadButton";

export interface IResourceComparisonOptions {
	setSelectedResources: (resources: string[]) => void;
	selectedResources: string[];
}

interface IProps {
	addManual?: () => void;
	import?: () => void;

	/**
	 * Parent resource ID (if used in the context of a RawTabularMergedEntry)
	 */
	resourceIdParentId?: string;

	/**
	 * Resource ID. Used for comparision
	 */
	resourceId: string;

	// Comparison
	comparison?: IResourceComparisonOptions;

	fileName?: string;
}

export function ResourceEntryContextMenu(props: PropsWithConnections<IProps>) {
	const button = (
		<EuiButtonIcon
			iconType={"boxesHorizontal"}
			onClick={() => setIsPopoverOpen(!isPopoverOpen)}
			aria-label={"Open context menu"}
		/>
	);

	const [isPopoverOpen, setIsPopoverOpen] = useState(false);

	const { selectedResources, setSelectedResources } = props.comparison ?? {};

	const resourceExportActions = [];

	if (props.fileName) {
		resourceExportActions.push(
			<EuiContextMenuItem icon={"download"} size={"s"} key={"exportFile"}>
				<ResourceFileDownloadButton
					renderAsLink
					resourceId={
						props.resourceIdParentId ?? // For merged entries this is set
						props.resourceId // For other entries the resource ID is used
					}
					fileName={props.fileName}
				/>
			</EuiContextMenuItem>
		);
	}

	return (
		<EuiPopover
			id={"resourceEntryContext"}
			button={button}
			isOpen={isPopoverOpen}
			closePopover={() => setIsPopoverOpen(false)}
			panelPaddingSize="none"
			anchorPosition="downLeft"
		>
			<EuiContextMenuPanel>
				{props.addManual && (
					<EuiContextMenuItem key="addDerived" icon="indexOpen" size="s" onClick={props.addManual}>
						Add derived resource
					</EuiContextMenuItem>
				)}
				{props.import && (
					<EuiContextMenuItem key="import" icon="importAction" size="s" onClick={props.import}>
						Import
					</EuiContextMenuItem>
				)}
				{props.comparison && (
					<>
						{!selectedResources?.includes(props.resourceId) ? (
							<EuiContextMenuItem
								key="addToComparison"
								icon="visAreaStacked"
								size="s"
								onClick={() => {
									assertDefined(setSelectedResources);
									assertDefined(selectedResources);
									setIsPopoverOpen(false);
									setSelectedResources([...selectedResources, props.resourceId]);
								}}
							>
								Add to comparison
							</EuiContextMenuItem>
						) : (
							<EuiContextMenuItem
								key="removeFromComparison"
								icon="visAreaStacked"
								size="s"
								onClick={() => {
									assertDefined(setSelectedResources);
									setIsPopoverOpen(false);
									setSelectedResources(selectedResources.filter((s) => props.resourceId !== s));
								}}
							>
								Remove from comparison
							</EuiContextMenuItem>
						)}
					</>
				)}
				<EuiContextMenuItem key="deleteResource" icon="trash" size="s">
					<DeleteResource
						buttonStyle={"link"}
						buttonColor={"danger"}
						resourceId={props.resourceId}
						connections={props.connections}
					/>
				</EuiContextMenuItem>
				{resourceExportActions}
			</EuiContextMenuPanel>
		</EuiPopover>
	);
}
