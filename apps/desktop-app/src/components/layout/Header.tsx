import {
	EuiCollapsibleNav,
	EuiHeader,
	EuiHeaderSection,
	EuiHeaderSectionItem,
	EuiHeaderSectionItemButton,
	EuiIcon,
	EuiToolTip,
} from "@elastic/eui";
import React, { useState } from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { Breadcrumbs } from "./Breadcrumbs";
import { HeaderProfile } from "./HeaderProfile";
import { useRouter } from "../../hooks/useRouter";
import { Search } from "../search/Search";
import { QuickAccessBar } from "../welcome/QuickAccessBar";

import type { HeaderFragment$key } from "@/relay/HeaderFragment.graphql";

const HeaderGraphQLFragment = graphql`
	fragment HeaderFragment on RepositoryQuery {
		...BreadcrumbsFragment
		currentUser {
			...HeaderProfile
		}
	}
`;

export function Header(props: { data: HeaderFragment$key }) {
	const data = useFragment(HeaderGraphQLFragment, props.data);

	const router = useRouter();

	return (
		<>
			<EuiHeader position="fixed" theme={"dark"}>
				<EuiHeaderSection grow={false}>
					<EuiHeaderSectionItem>
						<QuickAccessBarButton />
					</EuiHeaderSectionItem>
					<EuiHeaderSectionItem>
						<EuiHeaderSectionItemButton onClick={() => router.router.go(-1)} aria-label="Go back">
							<EuiToolTip content={"Backward"}>
								<EuiIcon type="arrowLeft" />
							</EuiToolTip>
						</EuiHeaderSectionItemButton>
						<EuiHeaderSectionItemButton onClick={() => router.router.go(1)} aria-label="Go forward">
							<EuiToolTip content={"Forward"}>
								<EuiIcon type="arrowRight" />
							</EuiToolTip>
						</EuiHeaderSectionItemButton>
					</EuiHeaderSectionItem>
					<EuiHeaderSectionItem>
						<Breadcrumbs data={data} />
					</EuiHeaderSectionItem>
				</EuiHeaderSection>

				<EuiHeaderSection side="right">
					<EuiHeaderSectionItem>
						<Search />
					</EuiHeaderSectionItem>

					<EuiHeaderSectionItem>
						<HeaderProfile currentUser={data.currentUser} />
					</EuiHeaderSectionItem>

					<EuiHeaderSectionItem>
						<EuiIcon
							type={"gear"}
							color={"ghost"}
							aria-label={"Settings"}
							onClick={() => {
								router.router.push("/repositories/settings");
							}}
						/>
					</EuiHeaderSectionItem>
				</EuiHeaderSection>
			</EuiHeader>
		</>
	);
}

function QuickAccessBarButton() {
	const [navIsOpen, setNavIsOpen] = useState(false);

	return (
		<>
			<EuiHeaderSectionItemButton onClick={() => setNavIsOpen(!navIsOpen)}>
				<EuiIcon
					color={"ghost"}
					type={"tableOfContents"}
					style={{ transform: "scale(-1, 1)" }} // Rotate icon 180°
					aria-label={"Open quick access bar"}
				/>
			</EuiHeaderSectionItemButton>
			<EuiCollapsibleNav
				size={300}
				isOpen={navIsOpen}
				// Keeps navigation flyout visible and push <body> content via padding
				isDocked={navIsOpen}
				onClose={() => {
					setNavIsOpen(false);
				}}
			>
				<QuickAccessBar />
			</EuiCollapsibleNav>
		</>
	);
}
