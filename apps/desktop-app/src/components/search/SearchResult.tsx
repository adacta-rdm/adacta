import type { IconType } from "@elastic/eui";
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel, EuiSpacer } from "@elastic/eui";
import type { ReactElement } from "react";
import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { useRouter } from "../../hooks/useRouter";
import type { RouterArgs } from "../../routes";
import type { AdactaIconTypes } from "../icons/AdactaIcon";
import { AdactaIconOrEuiToken } from "../icons/AdactaIcon";
import { OriginRepoIndicator } from "../originRepo/OriginRepoIndicator";

import type { SearchResult$data, SearchResult$key } from "@/relay/SearchResult.graphql";

const SearchResultGraphQLFragment = graphql`
	fragment SearchResult on HasMetadata {
		...OriginRepoIndicator
	}
`;

export interface ISearchResultProps {
	renderImage?: ReactElement;
	iconType: IconType | AdactaIconTypes;
	title: string;
	link?: RouterArgs;
	onClick?: () => void;
	properties: {
		text: string | ReactElement;
		iconType?: IconType | AdactaIconTypes;
		link?: RouterArgs;
	}[];
	close: () => void;
}

/**
 * This component can be called for things with origin metadata (i.e. devices, samples) or for
 * things without a specific origin (i.e. users). To avoid conditional hooks when calling
 * useFragment only in some cases this component is split up into different components
 */
export function SearchResult(props: ISearchResultProps & { metadata?: SearchResult$key }) {
	return props.metadata !== undefined ? (
		<SearchResultWithMetadata {...props} metadata={props.metadata} />
	) : (
		<SearchResultWithoutMetadata {...props} metadata={undefined} />
	);
}

function SearchResultWithoutMetadata(props: ISearchResultProps & { metadata: undefined }) {
	return <SearchResultPure {...props} metadata={props.metadata} />;
}

function SearchResultWithMetadata(props: ISearchResultProps & { metadata: SearchResult$key }) {
	const metadata = useFragment(SearchResultGraphQLFragment, props.metadata);
	return <SearchResultPure {...props} metadata={metadata} />;
}

function SearchResultPure(props: ISearchResultProps & { metadata?: SearchResult$data }) {
	const { renderImage, iconType, title, link, onClick, properties } = props;

	let icon: ReactElement;

	if (renderImage != undefined) {
		icon = renderImage;
	} else {
		icon = <AdactaIconOrEuiToken iconType={iconType} size={"l"} />;
	}

	if (props.metadata) {
		properties.push({
			text: <OriginRepoIndicator metadata={props.metadata} size={"small"} />,
		});
	}

	const { router } = useRouter();
	return (
		<>
			<EuiPanel>
				<EuiFlexGroup>
					<EuiFlexItem grow={false}>
						<EuiFlexGroup alignItems="center">
							<EuiFlexItem>{icon}</EuiFlexItem>
						</EuiFlexGroup>
					</EuiFlexItem>
					<EuiFlexItem>
						<EuiLink
							onClick={() => {
								if (link) {
									router.push(...link);
									props.close();
								} else if (onClick) {
									onClick();
									props.close();
								}
							}}
						>
							{title}
						</EuiLink>
						<EuiSpacer size="xs" />
						<EuiFlexGroup justifyContent={"flexStart"} gutterSize="xs">
							{properties.map(({ text, link, iconType }, i) => (
								<EuiFlexItem grow={false} key={i}>
									<EuiBadge color="default">
										<EuiFlexGroup gutterSize={"xs"}>
											{iconType !== undefined && (
												<EuiFlexItem grow={false}>
													<AdactaIconOrEuiToken iconType={iconType} />
												</EuiFlexItem>
											)}
											<EuiFlexItem grow={false}>
												<EuiLink
													color="text"
													disabled={!link}
													onClick={() => {
														if (link) {
															router.push(...link);
															props.close();
														}
													}}
												>
													{text}
												</EuiLink>
											</EuiFlexItem>
										</EuiFlexGroup>
									</EuiBadge>
								</EuiFlexItem>
							))}
						</EuiFlexGroup>
					</EuiFlexItem>
				</EuiFlexGroup>
			</EuiPanel>
			<EuiSpacer size="xs" />
		</>
	);
}
