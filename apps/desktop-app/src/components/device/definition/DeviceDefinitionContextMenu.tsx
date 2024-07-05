import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from "@elastic/eui";
import React, { useState } from "react";

import { DeleteWithConfirmation } from "../../utils/DeleteWithConfirmation";

export function DeviceDefinitionContextMenu(props: {
	name: string;

	deleteDefinition: () => void;
	deleteDefinitionDisableReason?: string;

	editDefinition: () => void;
}) {
	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

	const button = (
		<EuiButtonIcon
			aria-label={"Open Context-Menu"}
			iconType={"boxesHorizontal"}
			onClick={() => setIsContextMenuOpen(!isContextMenuOpen)}
		/>
	);

	return (
		<>
			<EuiPopover
				button={button}
				isOpen={isContextMenuOpen}
				closePopover={() => setIsContextMenuOpen(false)}
			>
				<EuiContextMenuPanel>
					<EuiContextMenuItem
						key={"delete"}
						icon={"trash"}
						disabled={props.deleteDefinitionDisableReason !== undefined}
					>
						<DeleteWithConfirmation
							onClick={() => {
								props.deleteDefinition();
								setIsContextMenuOpen(false);
							}}
							disableReason={props.deleteDefinitionDisableReason}
							confirmationText={`Are you sure you want to delete the Device-Type ${props.name}?`}
							buttonStyle={"link"}
						/>
					</EuiContextMenuItem>
					<EuiContextMenuItem
						key={"edit"}
						icon={"pencil"}
						onClick={() => {
							props.editDefinition();
							setIsContextMenuOpen(false);
						}}
					>
						Edit
					</EuiContextMenuItem>
				</EuiContextMenuPanel>
			</EuiPopover>
		</>
	);
}
