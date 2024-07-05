import { EuiButtonIcon, EuiContextMenu, EuiIcon, EuiPopover } from "@elastic/eui";
import React, { useState } from "react";

interface IProps {
	deviceId: string;

	show?: (id: string) => void;
	hide?: (id: string) => void;
	solo?: (id: string) => void;
}

export function LegendContextMenu(props: IProps) {
	const [popoverOpen, setPopoverOpen] = useState(false);

	return (
		<EuiPopover
			id="contextMenuNormal"
			button={
				<EuiButtonIcon
					aria-label="Open context menu for this device"
					iconType={"gear"}
					onClick={() => setPopoverOpen(true)}
				/>
			}
			isOpen={popoverOpen}
			closePopover={() => {
				setPopoverOpen(false);
			}}
			panelPaddingSize="none"
			offset={4}
		>
			<EuiContextMenu
				initialPanelId={0}
				panels={[
					{
						id: 0,
						title: "Series selection",
						items: [
							{
								name: "Show only series linked to the same device",
								icon: <EuiIcon type="iInCircle" size="m" />,
								onClick: () => {
									setPopoverOpen(false);
									if (props.deviceId && props.solo) {
										props.solo(props.deviceId);
									}
								},
							},
							{
								name: "Hide all series linked to the same device",
								icon: <EuiIcon type="minus" size="m" />,
								onClick: () => {
									setPopoverOpen(false);
									if (props.deviceId && props.hide) {
										props.hide(props.deviceId);
									}
								},
							},
						],
					},
				]}
			/>
		</EuiPopover>
	);
}
