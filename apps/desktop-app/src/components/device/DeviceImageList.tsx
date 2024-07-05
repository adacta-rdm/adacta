import { EuiAvatar, EuiFlexGroup, EuiFlexItem } from "@elastic/eui";
import React from "react";
import { graphql, useFragment } from "react-relay";

import { ImageList } from "./ImageList";

import type { DeviceImageList$key } from "@/relay/DeviceImageList.graphql";

interface IProps {
	device: DeviceImageList$key;
}

export function DeviceImageList(props: IProps) {
	const data = useFragment(
		graphql`
			fragment DeviceImageList on Device {
				name

				# Count Images to get fallback
				imageResource {
					__typename
				}
				definition {
					# Count Images to get fallback
					imageResource {
						__typename
					}
					...ImageList
				}
				...ImageList
			}
		`,
		props.device
	);

	if (data.imageResource.length + data.definition.imageResource.length == 0) {
		return (
			<EuiFlexItem grow={false}>
				<EuiAvatar name={data.name} size="xl" />
			</EuiFlexItem>
		);
	}

	return (
		<EuiFlexGroup alignItems="center" justifyContent="center">
			<ImageList images={data} />
			<ImageList images={data.definition} />
		</EuiFlexGroup>
	);
}
