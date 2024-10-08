import { EuiFlexGroup, EuiFlexItem, EuiPageTemplate } from "@elastic/eui";
import React from "react";

import type { GetDataArgs } from "@/routes/register";
import { RedirectException } from "~/apps/desktop-app/src/RedirectException";
import { AdactaPageTemplate } from "~/apps/desktop-app/src/components/layout/AdactaPageTemplate";
import { Register } from "~/apps/desktop-app/src/components/user/authentication/Register";

function getData({ graphQLHeaders }: GetDataArgs) {
	if (graphQLHeaders.authToken) {
		throw new RedirectException("/");
	}
}

export default function Route() {
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
