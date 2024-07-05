import { EuiLink, EuiTableRow, EuiTableRowCell } from "@elastic/eui";
import React, { useState } from "react";

import { PaddingHelper } from "./PaddingHelper";

/**
 * Helper component which lazily loads children after the user requests it by click
 */
export function LoadChildrenRowsOnDemand(props: {
	hasChildren: boolean;
	renderChildren: (level: number) => JSX.Element[];

	level: number;
	colSpan: number;
}) {
	// Initial state is hidden
	const [showChildren, setShowChildren] = useState(false);

	// Nothing to render if no children are available
	if (!props.hasChildren) {
		return null;
	}

	return (
		<>
			{showChildren ? (
				props.renderChildren(props.level)
			) : (
				<EuiTableRow>
					<EuiTableRowCell colSpan={props.colSpan}>
						<EuiLink onClick={() => setShowChildren(true)} color={"subdued"}>
							<PaddingHelper level={props.level + 1}>Load more</PaddingHelper>
						</EuiLink>
					</EuiTableRowCell>
				</EuiTableRow>
			)}
		</>
	);
}
