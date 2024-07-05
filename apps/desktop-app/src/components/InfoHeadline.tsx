import type { EuiTitleSize } from "@elastic/eui";
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiIconTip, EuiTitle } from "@elastic/eui";
import type { ReactElement } from "react";
import React from "react";

import type { EDocId } from "../interfaces/EDocId";
import { useService } from "../services/ServiceProvider";
import { DocFlyoutService } from "../services/toaster/FlyoutService";

interface IProps {
	name: string;
	size?: EuiTitleSize;
	docId?: EDocId;
	tooltip?: string;

	/**
	 * Elements that are displayed on the left side of the headline
	 */
	extraElementsLeft?: ReactElement[];

	/**
	 * Elements that are displayed on the far right side of the headline
	 *
	 * NOTE: The current alignment logic requires that at least one extraElementsLeft to be defined.
	 * Since there is no usage without extraElementsLeft this limitation is not a problem
	 */
	extraElementRight?: ReactElement[];
}

export function InfoHeadline(props: IProps) {
	const docFlyoutService = useService(DocFlyoutService);
	const { name, size, docId, tooltip, extraElementsLeft, extraElementRight } = props;
	return (
		<EuiTitle size={size ?? "xs"}>
			<EuiFlexGroup alignItems="center" gutterSize="xs">
				<EuiFlexItem grow={false}>{name}</EuiFlexItem>
				{tooltip && (
					<EuiFlexItem grow={false}>
						<EuiIconTip content={tooltip} position="right" />
					</EuiFlexItem>
				)}
				{docId && (
					<EuiFlexItem grow={false}>
						<EuiIcon type="questionInCircle" onClick={() => docFlyoutService.showDoc(docId)} />
					</EuiFlexItem>
				)}
				{extraElementsLeft?.map((e, index) => (
					<div key={e.key}>
						{e}
						<EuiFlexItem
							grow={
								// Let last element grow to align all other elements to the right
								index === extraElementsLeft?.length - 1
							}
							key={"last"}
						/>
					</div>
				))}
				{extraElementRight?.map((e) => (
					<EuiFlexItem grow={false} key={e.key}>
						{e}
					</EuiFlexItem>
				))}
			</EuiFlexGroup>
		</EuiTitle>
	);
}
