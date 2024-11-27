import {
	EuiButton,
	EuiButtonIcon,
	EuiContextMenu,
	EuiFlexGroup,
	EuiFlexItem,
	EuiPopover,
} from "@elastic/eui";
import React, { useState } from "react";

import { useRepoRouterHook } from "~/apps/desktop-app/src/services/router/RepoRouterHook";
import { assertDefined } from "~/lib/assert";

export function ResourceFileImportButton({
	resourceId,
	uploadDeviceId,
	fileType,
}: {
	uploadDeviceId: string | null;
	resourceId: string;
	fileType?: string; // extension based "xlsx" | "dat" | ...
}) {
	const { router, repositoryId } = useRepoRouterHook();
	const [showContextMenu, setShowContextMenu] = useState(false);

	return (
		<EuiFlexGroup responsive={false} gutterSize="xs">
			<EuiFlexItem grow={false}>
				<EuiButton
					disabled={fileType !== undefined || uploadDeviceId === null}
					size="s"
					onClick={() => {
						if (uploadDeviceId) {
							router.push("/repositories/:repositoryId/devices/:deviceId/importer/:resourceId", {
								repositoryId,
								deviceId: uploadDeviceId,
								resourceId,
							});
						}
					}}
				>
					Start Import Wizard
				</EuiButton>
			</EuiFlexItem>
			<EuiFlexItem grow={false}>
				<EuiPopover
					isOpen={showContextMenu}
					button={
						<EuiButtonIcon
							display="base"
							size="s"
							iconType="boxesVertical"
							aria-label="More"
							disabled={fileType !== "dat"}
							onClick={() => setShowContextMenu(!showContextMenu)}
						/>
					}
				>
					<EuiContextMenu
						initialPanelId={0}
						panels={[
							{
								id: 0,
								title: "Alternative Import Methods",
								items: [
									{
										disabled: fileType !== "dat" || uploadDeviceId === null,
										name: "Import as Gamry/.DAT",
										onClick: () => {
											assertDefined(uploadDeviceId); // Button is disabled if uploadDeviceId is null
											router.push(
												"/repositories/:repositoryId/devices/:deviceId/gamry/:resourceId",
												{
													repositoryId,
													deviceId: uploadDeviceId,
													resourceId,
												}
											);

											setShowContextMenu(false);
										},
									},
								],
							},
						]}
					/>
				</EuiPopover>
			</EuiFlexItem>
		</EuiFlexGroup>
	);
}
