import { EuiIcon, EuiImage } from "@elastic/eui";
import { isNonNullish } from "@omegadot/assert";
import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import type { DevicePreviewImage$key } from "@/relay/DevicePreviewImage.graphql";

export function DevicePreviewImage(props: { data: DevicePreviewImage$key }) {
	const data = useFragment(
		graphql`
			fragment DevicePreviewImage on Device {
				name
				definition {
					imageResource {
						dataURI
					}
				}
				imageResource {
					dataURI
				}
			}
		`,
		props.data
	);

	const dataUris = [
		...data.imageResource.filter(isNonNullish).map((image) => image.dataURI),
		...data.definition.imageResource.filter(isNonNullish).map((image) => image.dataURI),
	];

	const dataURI = dataUris[0];
	return dataURI ? (
		<EuiImage
			style={{ marginRight: 10 }}
			allowFullScreen
			size={25}
			alt={`${data.name} preview`}
			src={dataURI}
		/>
	) : (
		// Empty icon to keep the indentation of the layout consistent
		<EuiIcon type="empty" style={{ marginRight: 10, width: 25 }} />
	);
}
