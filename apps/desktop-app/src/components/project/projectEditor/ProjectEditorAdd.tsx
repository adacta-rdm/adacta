import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiForm, EuiFormRow } from "@elastic/eui";
import React, { useState } from "react";

import { UniqueName } from "../../UniqueName";

interface IProps {
	onAdd: (name: string) => void;
}

export function ProjectEditorAdd(props: IProps) {
	const [errors, setErrors] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const [projectName, setProjectName] = useState("");

	return (
		<EuiFlexGroup>
			<EuiForm isInvalid={!!errors.length} error={errors}>
				<EuiFlexItem>
					<EuiFormRow label="Project name">
						<UniqueName
							value={projectName}
							onChange={(e) => setProjectName(e.target.value)}
							uniqueName={{
								checkFor: "PROJECT",
								setErrors,
								formState: { isLoading, setIsLoading },
							}}
						/>
					</EuiFormRow>
				</EuiFlexItem>
				<EuiFlexItem>
					<EuiFormRow hasEmptyLabelSpace={true}>
						<EuiButton
							isDisabled={isLoading}
							onClick={() => {
								if (errors.length > 0 || isLoading) {
									return;
								}

								props.onAdd(projectName);
							}}
						>
							Add project
						</EuiButton>
					</EuiFormRow>
				</EuiFlexItem>
			</EuiForm>
		</EuiFlexGroup>
	);
}
