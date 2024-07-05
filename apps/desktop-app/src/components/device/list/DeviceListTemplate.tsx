import assert from "assert";

import {
	EuiButton,
	EuiButtonIcon,
	EuiFlexGroup,
	EuiFlexItem,
	EuiPageTemplate,
	EuiSpacer,
	EuiTab,
	EuiTabs,
} from "@elastic/eui";
import type { PropsWithChildren } from "react";
import React from "react";

import { EDocId } from "../../../interfaces/EDocId";
import { useService } from "../../../services/ServiceProvider";
import { useRepoRouterHook } from "../../../services/router/RepoRouterHook";
import { DocFlyoutService } from "../../../services/toaster/FlyoutService";
import { AdactaPageTemplate } from "../../layout/AdactaPageTemplate";
import { ManageNameCompositionButton } from "../../nameComposition/ManageNameCompositionButton";

export function DeviceListTemplate(
	props: PropsWithChildren<{
		selectedTab?: "flat" | "hierarchical" | "deviceDefinitions";

		/**
		 * If set, a button is shown in the header to add a device or device definition.
		 */
		mainAction?:
			| { type: "addDevice"; onAddAddDevice?: () => void }
			| { type: "addDeviceDefinition"; onAddAddDeviceDefinition?: () => void };
	}>
) {
	const docFlyoutService = useService(DocFlyoutService);

	const { router, repositoryId } = useRepoRouterHook();

	const items = [];
	const actionItems = props.mainAction;
	if (actionItems?.type === "addDevice") {
		items.push(
			<EuiButton
				fill
				key="add"
				disabled={!actionItems.onAddAddDevice}
				onClick={() => {
					assert(actionItems.type === "addDevice");
					if (actionItems.onAddAddDevice) {
						actionItems.onAddAddDevice();
					}
				}}
			>
				Add Device
			</EuiButton>
		);
	} else if (actionItems?.type === "addDeviceDefinition") {
		items.push(
			<EuiButton
				fill
				key="add"
				disabled={!actionItems.onAddAddDeviceDefinition}
				onClick={() => {
					assert(actionItems.type === "addDeviceDefinition");
					if (actionItems.onAddAddDeviceDefinition) {
						actionItems.onAddAddDeviceDefinition();
					}
				}}
			>
				Add Device-Type
			</EuiButton>
		);
	}

	items.push(<ManageNameCompositionButton />);

	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header
				pageTitle={
					<EuiFlexGroup alignItems="baseline" gutterSize="xs">
						<EuiFlexItem grow={false}>Devices</EuiFlexItem>
						<EuiFlexItem grow={false}>
							<EuiButtonIcon
								aria-label={"Open Documentation"}
								color="text"
								iconType="questionInCircle"
								onClick={() => docFlyoutService.showDoc(EDocId.DEVICES)}
							/>
						</EuiFlexItem>
					</EuiFlexGroup>
				}
				rightSideItems={items}
			/>
			<EuiPageTemplate.Section>
				<EuiTabs>
					<EuiTab
						isSelected={props.selectedTab === "hierarchical"}
						onClick={() => router.push("/repositories/:repositoryId/devices/", { repositoryId })}
					>
						Hierarchical List
					</EuiTab>
					<EuiTab
						isSelected={props.selectedTab === "flat"}
						onClick={() =>
							router.push("/repositories/:repositoryId/devices/flat", { repositoryId })
						}
					>
						Flat List
					</EuiTab>
					<EuiTab
						isSelected={props.selectedTab === "deviceDefinitions"}
						onClick={() =>
							router.push("/repositories/:repositoryId/deviceDefinitions/", { repositoryId })
						}
					>
						Device-Types
					</EuiTab>
				</EuiTabs>
				<EuiSpacer />
				{props.children}
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}
