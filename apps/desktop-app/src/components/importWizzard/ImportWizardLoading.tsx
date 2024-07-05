import { EuiButtonIcon, EuiSelect, EuiSkeletonText } from "@elastic/eui";
import type { EuiStepHorizontalProps } from "@elastic/eui/src/components/steps/step_horizontal";
import React from "react";

import { ImportWizardLayout } from "./layout/ImportWizardLayout";

export function ImportWizardLoading(props: { steps?: Omit<EuiStepHorizontalProps, "step">[] }) {
	return (
		<ImportWizardLayout
			progress={0}
			steps={props.steps ?? []}
			presetList={<PresetSelectionLoading />}
		>
			<EuiSkeletonText />
		</ImportWizardLayout>
	);
}

function PresetSelectionLoading() {
	return (
		<EuiSelect
			options={[{ value: "", text: "Select preset" }]}
			style={{ width: "250px" }}
			value={""}
			append={
				<>
					<EuiButtonIcon aria-label="load preset" iconType="download" disabled={true} />
					<EuiButtonIcon aria-label="Save" iconType="save" disabled={true} />
					<EuiButtonIcon aria-label="edit preset" iconType="indexEdit" disabled={true} />
				</>
			}
		/>
	);
}
