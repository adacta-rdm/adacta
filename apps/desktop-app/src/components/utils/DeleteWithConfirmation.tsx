import { EuiButton, EuiButtonIcon, EuiConfirmModal, EuiLink, EuiToolTip } from "@elastic/eui";
import type { EuiLinkColor } from "@elastic/eui/src/components/link/link";
import React, { useState } from "react";

export interface IDeleteButtonConfig {
	/**
	 * Chose between "trashbin"-icon or delete link/button
	 */
	buttonStyle?: "icon" | "link" | "button";
	buttonColor?: EuiLinkColor;
	isLoading?: boolean;

	size?: "s" | "m";
}

export function DeleteWithConfirmation(
	props: {
		onClick: () => void;
		disableReason?: string;
		confirmationText: string | React.ReactNode;
	} & IDeleteButtonConfig
) {
	const [showModal, setShowModal] = useState(false);

	const modal = showModal ? (
		<EuiConfirmModal
			title={"Confirm deletion"}
			onCancel={() => setShowModal(false)}
			onConfirm={props.onClick}
			cancelButtonText={"Abort"}
			confirmButtonText={"Delete"}
			buttonColor="danger"
		>
			{props.confirmationText}
		</EuiConfirmModal>
	) : null;

	const sharedProps = {
		disabled: !!props.disableReason,
		isLoading: props.isLoading,
		onClick: () => setShowModal(true),
		size: props.size,
	};

	// Render different "button" styles depending on the selected mode
	const button =
		props.buttonStyle === "link" ? (
			<EuiLink color={"danger"} {...sharedProps}>
				Delete
			</EuiLink>
		) : props.buttonStyle === "button" ? (
			<EuiButton {...sharedProps}>Delete</EuiButton>
		) : (
			<EuiButtonIcon {...sharedProps} iconType={"trash"} aria-label={"Delete"} />
		);

	return (
		<>
			{modal}
			{props.disableReason ? (
				<EuiToolTip content={props.disableReason}>{button}</EuiToolTip>
			) : (
				button
			)}
		</>
	);
}
