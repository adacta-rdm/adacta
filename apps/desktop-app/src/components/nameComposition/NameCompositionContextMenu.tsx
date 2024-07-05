import { EuiButtonIcon, EuiContextMenu, EuiIcon, EuiPopover } from "@elastic/eui";
import React, { useState } from "react";
import { graphql, useMutation } from "react-relay";

import { useRepositoryId } from "../../services/router/UseRepoId";
import { AdactaIcon } from "../icons/AdactaIcon";

import type { NameCompositionContextMenuDeviceMutation } from "@/relay/NameCompositionContextMenuDeviceMutation.graphql";
import type { NameCompositionContextMenuSampleMutation } from "@/relay/NameCompositionContextMenuSampleMutation.graphql";

export function NameCompositionContextMenu({
	nameCompositionId,
	deleteComposition,
}: {
	nameCompositionId: string;
	deleteComposition: () => void;
}) {
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);
	const repositoryId = useRepositoryId();

	const closePopover = () => setIsPopoverOpen(false);

	const [makeDeviceNamingStrategy, deviceLoading] =
		useMutation<NameCompositionContextMenuDeviceMutation>(graphql`
			mutation NameCompositionContextMenuDeviceMutation($id: ID!, $repositoryId: ID!) {
				repository(id: $repositoryId) {
					repoConfigSetDefaultDeviceNamingStrategy(id: $id) {
						id
						usageType
					}
				}
			}
		`);

	const [makeSampleNamingStrategy, sampleLoading] =
		useMutation<NameCompositionContextMenuSampleMutation>(graphql`
			mutation NameCompositionContextMenuSampleMutation($id: ID!, $repositoryId: ID!) {
				repository(id: $repositoryId) {
					repoConfigSetDefaultSampleNamingStrategy(id: $id) {
						id
						usageType
					}
				}
			}
		`);

	const isLoading = deviceLoading || sampleLoading;

	return (
		<EuiPopover
			id={"nameCompositionContextMenu"}
			button={
				<EuiButtonIcon
					iconType={"boxesHorizontal"}
					onClick={() => setIsPopoverOpen(true)}
					isLoading={isLoading}
				/>
			}
			isOpen={isPopoverOpen}
			closePopover={closePopover}
			panelPaddingSize="none"
			anchorPosition="downLeft"
		>
			<EuiContextMenu
				initialPanelId={0}
				panels={[
					{
						id: 0,
						title: "Actions",
						items: [
							{
								icon: <AdactaIcon type={"Device"} size={"m"} />,
								name: "Use as naming strategy for devices",
								onClick: () => {
									makeDeviceNamingStrategy({ variables: { id: nameCompositionId, repositoryId } });
									closePopover();
								},
							},
							{
								icon: <AdactaIcon type={"Sample"} size={"m"} />,
								name: "Use as naming strategy for samples",
								onClick: () => {
									makeSampleNamingStrategy({ variables: { id: nameCompositionId, repositoryId } });
									closePopover();
								},
							},
							{
								icon: <EuiIcon type={"trash"} size={"m"} />,
								name: "Delete composition",
								onClick: () => {
									deleteComposition();
									closePopover();
								},
							},
						],
					},
				]}
			/>
		</EuiPopover>
	);
}
