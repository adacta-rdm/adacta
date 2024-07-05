import { EuiFlexGroup, EuiFlexItem, EuiPopover } from "@elastic/eui";
import { css } from "@emotion/react";
import React, { Suspense, useEffect, useState } from "react";
import { graphql, useFragment, useQueryLoader } from "react-relay";

import { DevicePopover, DevicePopoverGraphQLQuery } from "./DevicePopover";
import { DevicePopoverLoading } from "./DevicePopoverLoading";
import { useRepoRouterHook } from "../../services/router/RepoRouterHook";
import { RepositoryContext, useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { Link } from "../Link";
import { AdactaIcon } from "../icons/AdactaIcon";

import type { DeviceLink$key } from "@/relay/DeviceLink.graphql";
import type { DevicePopoverQuery } from "@/relay/DevicePopoverQuery.graphql";
import { createIDatetime } from "~/lib/createDate";

const DeviceLinkGraphQLFragment = graphql`
	fragment DeviceLink on Device {
		id
		displayName
		shortId
	}
`;

interface IProps {
	data: DeviceLink$key;
	timestamp?: Date;
	/**
	 * Enables popover mode in which DeviceLink won't render additional popovers
	 */
	popoverMode?: boolean;
	textOverwrite?: string;

	prependIcon?: boolean;
	repositoryId?: string;

	/**
	 * Controls if the shortId should be shown in the link text.
	 */
	showShortId?: boolean;

	/**
	 * If true, the link text will be underlined on hover.
	 */
	underlineOnHover?: boolean;
}

export function DeviceLink(props: IProps) {
	return (
		<RepositoryContext.Provider value={props.repositoryId}>
			<DeviceLinkCore {...props} />
		</RepositoryContext.Provider>
	);
}

function DeviceLinkCore(props: IProps) {
	const device = useFragment(DeviceLinkGraphQLFragment, props.data);
	const [devicePopoverQueryRef, loadDevicePopoverQuery] =
		useQueryLoader<DevicePopoverQuery>(DevicePopoverGraphQLQuery);

	const { repositoryId } = useRepoRouterHook();
	const repositoryIdVariable = useRepositoryIdVariable();
	const { textOverwrite } = props;
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);
	const [hoverDelayHandler, setHoverDelayHandler] = useState<NodeJS.Timeout | undefined>(undefined);

	const [leaveDelayHandler, setLeaveDelayHandler] = useState<NodeJS.Timeout | undefined>(undefined);

	const underLineOnHoverCss = props.underlineOnHover
		? css`
				:hover {
					text-decoration: underline;
				}
		  `
		: undefined;
	let linkText = <span css={underLineOnHoverCss}>{textOverwrite ?? device.displayName}</span>;
	if (props.showShortId && device.shortId) {
		linkText = (
			<span css={underLineOnHoverCss}>
				id:<i>{device.shortId}</i> - {linkText}
			</span>
		);
	}
	const removeHoverHandler = () => {
		if (hoverDelayHandler) {
			clearTimeout(hoverDelayHandler);
		}
	};
	const removeLeaveHandler = () => {
		if (leaveDelayHandler) {
			clearTimeout(leaveDelayHandler);
		}
	};
	const addHoverHandler = () => {
		setHoverDelayHandler(
			setTimeout(() => {
				// This component is written in such a way that the query can be preloaded
				// Originally the query was loaded on hover (without delay). This triggered a huge
				// amount of unnecessary queries (just imagine the user hovering over a column full
				// of DeviceLinks).
				// For now the query loading and the popover opening is at the "same" time.
				// In theory different timeouts could be used for loading and opening the popover.
				// I'm not doing that right now because it would add little benefit and would make
				// the timeout handling more complex.
				loadDevicePopoverQuery({
					deviceId: device.id,
					time: createIDatetime(props.timestamp ?? new Date()),
					...(props.repositoryId ? { repositoryId: props.repositoryId } : repositoryIdVariable),
				});
				setIsPopoverOpen(true);
			}, 500)
		);
	};
	const addLeaveHandler = () => {
		// Schedule popover closing and save timeout to be able to cancel this event
		// Popover will not get closed instantly to give the user time to enter the popover.
		// If the mouse enters the popover this timeout will get canceled and the popover will stay open.
		setLeaveDelayHandler(
			setTimeout(() => {
				closePopover();
			}, 1000)
		);
	};
	const closePopover = () => {
		// Cancel old popover timeouts since mouse has left the trigger
		removeHoverHandler();
		removeLeaveHandler();
		setIsPopoverOpen(false);
	};
	// Return removeHandler as cleanup function. This avoids opening popups in unmounted components
	useEffect(() => {
		return () => {
			removeHoverHandler();
			removeLeaveHandler();
		};
	});

	// Render link with hover popover
	const link = (
		<Link
			to={["/repositories/:repositoryId/devices/:deviceId/", { repositoryId, deviceId: device.id }]}
			onMouseEnter={() => {
				addHoverHandler();
			}}
			onMouseLeave={addLeaveHandler}
		>
			<EuiFlexGroup alignItems="center" gutterSize={"xs"}>
				{props.prependIcon && (
					<EuiFlexItem grow={false}>
						<AdactaIcon type={"Device"} />
					</EuiFlexItem>
				)}
				<EuiFlexItem>{linkText}</EuiFlexItem>
			</EuiFlexGroup>
		</Link>
	);

	// Only render simple link (without additional popovers) if this link is already part of a popover
	if (props.popoverMode) {
		return (
			<Link
				to={[
					"/repositories/:repositoryId/devices/:deviceId/",
					{ repositoryId, deviceId: device.id },
				]}
			>
				{linkText}
			</Link>
		);
	}
	// Note: Inner div is only needed for onMouseEnter/onMouseLeave. onMouseEnter/onMouseLeave of EuiPopover would trigger at the wrong mouse positions
	return (
		<EuiPopover
			button={link}
			isOpen={isPopoverOpen}
			closePopover={closePopover}
			panelStyle={{ width: 800 }}
			panelPaddingSize="none"
			onClick={(e) => e.stopPropagation()}
			style={{
				verticalAlign: "inherit",
				height: 24, // Set height explicitly to avoid larger than all the other Links
			}}
		>
			<div onMouseEnter={removeLeaveHandler} onMouseLeave={closePopover}>
				{devicePopoverQueryRef && (
					<Suspense fallback={<DevicePopoverLoading />}>
						<DevicePopover
							timestamp={props.timestamp}
							historyMode={!!props.timestamp}
							queryRef={devicePopoverQueryRef}
						/>
					</Suspense>
				)}
			</div>
		</EuiPopover>
	);
}
