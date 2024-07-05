import { EuiFlexGroup, EuiFlexItem, EuiPageTemplate } from "@elastic/eui";
import React from "react";

import type { IRouteGetDataFunctionArgs } from "~/apps/desktop-app/src/IRouteConfig";
import { RedirectException } from "~/apps/desktop-app/src/RedirectException";
import { AdactaPageTemplate } from "~/apps/desktop-app/src/components/layout/AdactaPageTemplate";
import { Register } from "~/apps/desktop-app/src/components/user/authentication/Register";

export function getData({ graphQLHeaders }: IRouteGetDataFunctionArgs) {
	if (graphQLHeaders.authToken) {
		throw new RedirectException("/");
	}
}
export default function () {
	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header
				pageTitle={
					<EuiFlexGroup alignItems="baseline" gutterSize="xs">
						<EuiFlexItem grow={false}>Register</EuiFlexItem>
					</EuiFlexGroup>
				}
			/>
			<EuiPageTemplate.Section>
				<Register />
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}
