import {
	EuiButtonIcon,
	EuiFlexGroup,
	EuiFlexItem,
	EuiPageTemplate,
	EuiProgress,
	EuiStepsHorizontal,
} from "@elastic/eui";
import type { EuiStepHorizontalProps } from "@elastic/eui/src/components/steps/step_horizontal";
import type { PropsWithChildren, ReactElement } from "react";
import React from "react";

import { EDocId } from "../../../interfaces/EDocId";
import { useService } from "../../../services/ServiceProvider";
import { DocFlyoutService } from "../../../services/toaster/FlyoutService";
import { AdactaPageTemplate } from "../../layout/AdactaPageTemplate";

interface IProps {
	progress: number;

	steps: Omit<EuiStepHorizontalProps, "step">[];

	presetList: ReactElement;
}

/**
 * Generic Layout/Wrapper for the ImportWizard and the fallback ImportWizardLoading
 */
export function ImportWizardLayout(props: PropsWithChildren<IProps>) {
	const docFlyoutService = useService(DocFlyoutService);

	return (
		<AdactaPageTemplate className={"fullheight-with-footer"}>
			<EuiPageTemplate.Header
				pageTitle={
					<EuiFlexGroup alignItems="baseline" gutterSize="xs">
						<EuiFlexItem grow={false}>Import</EuiFlexItem>
						<EuiFlexItem grow={false}>
							<EuiButtonIcon
								aria-label={"Open Documentation"}
								color="text"
								iconType="questionInCircle"
								onClick={() => docFlyoutService.showDoc(EDocId.IMPORTWIZARD)}
							/>
						</EuiFlexItem>
					</EuiFlexGroup>
				}
				rightSideItems={[
					<EuiFlexItem key={"presets"} grow={false}>
						{props.presetList}
					</EuiFlexItem>,
					<EuiStepsHorizontal key={"steps"} size={"s"} steps={props.steps} />,
				]}
			/>
			{/*Using a "plain" html section since the EuiPageTemplate.Section uses multiple
			elements/classes which seem to break our scrolling behaviour for large spreadsheets*/}
			<section
				style={{
					// Custom styling for our custom section
					display: "flex",
					flexDirection: "column",

					// Reset min-dimensions to avoid "content based" sizing otherwise the
					// Spreadsheet will just grow endlessly without scrollbars appearing.
					minWidth: 0,
					minHeight: 0,

					// Styles adapted from EuiPageTemplate.Section
					padding: 24,
					backgroundColor: "#FFF",
				}}
				className={"eui-section-reset"}
			>
				{props.progress > 0 && (
					<EuiProgress size="s" color="accent" position="fixed" value={props.progress} max={100} />
				)}
				{props.children}
			</section>
		</AdactaPageTemplate>
	);
}
