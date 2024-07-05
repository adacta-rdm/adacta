import {
	EuiBadge,
	EuiButton,
	EuiFlexGroup,
	EuiFlexItem,
	EuiListGroup,
	EuiListGroupItem,
	EuiPopover,
	EuiText,
} from "@elastic/eui";
import React, { useState } from "react";

import { useRepoRouterHook } from "../../services/router/RepoRouterHook";

interface IProps {
	parentResource: { readonly id: string } | null;
	childResources:
		| readonly ({
				readonly name: string;
				readonly subName: string | null;
				readonly id: string;
		  } | null)[]
		| null;
}

export function ResourceHierarchyNavigation(props: IProps) {
	const { router, repositoryId } = useRepoRouterHook();
	const [isChildrenPopoverOpen, setIsChildrenPopoverOpen] = useState(false);

	const parentButton = props.parentResource && (
		<EuiFlexItem>
			<EuiButton
				onClick={() => {
					if (props.parentResource) {
						router.push("/repositories/:repositoryId/resources/:resourceId", {
							repositoryId,
							resourceId: props.parentResource.id,
						});
					}
				}}
				iconType="arrowUp"
				iconSide="right"
				fill
				size={"s"}
			>
				Parent
			</EuiButton>
		</EuiFlexItem>
	);

	const childrenButton = (
		<EuiFlexItem>
			<EuiButton
				onClick={() => {
					setIsChildrenPopoverOpen(true);
				}}
				iconType="arrowDown"
				iconSide="right"
				fill
				size="s"
			>
				Children
			</EuiButton>
		</EuiFlexItem>
	);

	const childrenPopover =
		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		props.childResources?.length ? (
			<EuiPopover
				ownFocus
				button={childrenButton}
				isOpen={isChildrenPopoverOpen}
				closePopover={() => setIsChildrenPopoverOpen(false)}
			>
				<EuiText>
					<EuiListGroup>
						{props.childResources?.map((c, i) => {
							return (
								c && (
									<EuiListGroupItem
										key={i}
										label={
											<>
												{c.name}
												{c.subName && (
													<>
														{" "}
														<EuiBadge>{c.subName}</EuiBadge>
													</>
												)}
											</>
										}
										wrapText={true}
										href="#"
										onClick={() => {
											router.push("/repositories/:repositoryId/resources/:resourceId", {
												repositoryId,
												resourceId: c.id,
											});
											setIsChildrenPopoverOpen(false);
										}}
									/>
								)
							);
						})}
					</EuiListGroup>
				</EuiText>
			</EuiPopover>
		) : null;

	return (
		<EuiFlexGroup>
			{parentButton}
			{childrenPopover}
		</EuiFlexGroup>
	);
}
