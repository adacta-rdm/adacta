import {
	EuiAvatar,
	EuiButton,
	EuiFlexGroup,
	EuiFlexItem,
	EuiHeaderSectionItemButton,
	EuiPopover,
	EuiPopoverTitle,
	EuiToolTip,
} from "@elastic/eui";
import React, { useState } from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { useRouter } from "../../hooks/useRouter";
import { useRepositoryIdMaybe } from "../../services/router/UseRepoId";
import { Logout } from "../user/authentication/Logout";

import type { HeaderProfile$key } from "@/relay/HeaderProfile.graphql";

const HeaderProfileGraphQLFragment = graphql`
	fragment HeaderProfile on CurrentUser {
		payload {
			user {
				id
				name
			}
		}
	}
`;

export function HeaderProfile(props: { currentUser: HeaderProfile$key }) {
	const data = useFragment(HeaderProfileGraphQLFragment, props.currentUser);
	const [isOpen, setIsOpen] = useState(false);

	const user = data.payload.user;

	const repositoryId = useRepositoryIdMaybe();
	const { router } = useRouter();

	const button = (
		<EuiHeaderSectionItemButton onClick={() => setIsOpen(!isOpen)}>
			<EuiAvatar color="#fbf9ee" name={user.name} size="s" />
		</EuiHeaderSectionItemButton>
	);

	const onVisitProfile = () => {
		setIsOpen(false);
		if (repositoryId) {
			router.push("/repositories/:repositoryId/users/:userId", { repositoryId, userId: user.id });
		}
	};

	return (
		<EuiPopover
			ownFocus
			button={button}
			isOpen={isOpen}
			anchorPosition="downRight"
			closePopover={() => setIsOpen(false)}
		>
			<EuiPopoverTitle>
				<EuiFlexGroup>
					<EuiFlexItem grow={false}>
						<EuiAvatar color="#fbf9ee" name={user.name} size="s" />
					</EuiFlexItem>
					<EuiFlexItem>{user.name}</EuiFlexItem>
				</EuiFlexGroup>
			</EuiPopoverTitle>

			<EuiFlexGroup alignItems="center">
				<EuiFlexItem grow={false}>
					<EuiToolTip
						content={
							repositoryId == undefined
								? "User profiles can only be viewed if a repository is selected. Select a repository in the repository picker (top left) to view your profile."
								: undefined
						}
					>
						<EuiButton onClick={onVisitProfile} disabled={repositoryId == undefined}>
							Visit Profile
						</EuiButton>
					</EuiToolTip>
				</EuiFlexItem>

				<EuiFlexItem grow={false}>
					<Logout />
				</EuiFlexItem>
			</EuiFlexGroup>
		</EuiPopover>
	);
}
