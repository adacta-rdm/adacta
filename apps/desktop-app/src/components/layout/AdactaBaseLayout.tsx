import { EuiPageHeader, EuiPageHeaderSection } from "@elastic/eui";
import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { Footer } from "./Footer";
import { Header } from "./Header";
import { GlobalDocFlyout } from "../../services/toaster/FlyoutService";
import { GlobalToastList } from "../../services/toaster/ToasterService";
import { AppChangelog } from "../appChangelog/AppChangelog";

import type { AdactaBaseLayoutFragment$key } from "@/relay/AdactaBaseLayoutFragment.graphql";

const AdactaBaseLayoutFragment = graphql`
	fragment AdactaBaseLayoutFragment on RepositoryQuery {
		...HeaderFragment
	}
`;

/**
 * Base layout for all pages in the app after login.
 *
 * @param props
 * @constructor
 */
export function AdactaBaseLayout(
	props: React.PropsWithChildren<{ data: AdactaBaseLayoutFragment$key }>
) {
	const data = useFragment(AdactaBaseLayoutFragment, props.data);

	return (
		<>
			<EuiPageHeader>
				<EuiPageHeaderSection>
					<Header data={data} />
				</EuiPageHeaderSection>
			</EuiPageHeader>
			<GlobalDocFlyout>{props.children}</GlobalDocFlyout>
			<Footer />
			<GlobalToastList />
			<AppChangelog />
		</>
	);
}
