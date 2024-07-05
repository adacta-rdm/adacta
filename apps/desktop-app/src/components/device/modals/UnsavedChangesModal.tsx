import { EuiConfirmModal, EuiIcon } from "@elastic/eui";
import React from "react";

interface IProps {
	onCancel: () => void;
	onConfirm: () => void;
}

export function UnsavedChangesModal({ onCancel, onConfirm }: IProps) {
	return (
		<EuiConfirmModal
			title="Unsaved changes in edit mode"
			cancelButtonText="Cancel"
			confirmButtonText="Ignore unsaved changes"
			buttonColor="danger"
			defaultFocusedButton="confirm"
			onCancel={onCancel}
			onConfirm={onConfirm}
		>
			<p>
				Some of your changes are not saved yet. Please make sure that each specification you want to
				edit is also saved using the <EuiIcon type={"save"} />
				-Button.
			</p>
			<p>Do you want to ignore those changes?</p>
		</EuiConfirmModal>
	);
}
