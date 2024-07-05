import { EuiBottomBar, EuiFlexGroup, EuiFlexItem, EuiText } from "@elastic/eui";
import React from "react";

import { BUILD_DATE, COMMIT_SHA, PACKAGE_VERSION } from "~/lib/buildTimeConstants";

export function Footer() {
	return (
		<EuiBottomBar paddingSize="none" className="footer">
			<EuiFlexGroup justifyContent="spaceBetween" style={{ padding: "2px 10px" }}>
				<EuiFlexItem grow={false}>
					<EuiText size="xs">
						adacta {PACKAGE_VERSION} ({BUILD_DATE} {COMMIT_SHA})
					</EuiText>
				</EuiFlexItem>
			</EuiFlexGroup>
		</EuiBottomBar>
	);
}
