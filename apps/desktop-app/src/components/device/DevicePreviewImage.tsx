import { EuiFlexItem } from "@elastic/eui";
import { isNonNullish } from "@omegadot/assert";
import type { ReactElement } from "react";
import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import type { DevicePreviewImage$key } from "@/relay/DevicePreviewImage.graphql";
import { AdactaImage } from "~/apps/desktop-app/src/components/image/AdactaImage";

export function DevicePreviewImage(props: {
	data: DevicePreviewImage$key;
	asFlexItem?: boolean;
	fallback?: ReactElement;
}) {
	const data = useFragment(
		graphql`
			fragment DevicePreviewImage on Device {
				name
				definition {
					imageResource {
						...AdactaImageFragment @arguments(preset: ICON)
					}
				}
				imageResource {
					...AdactaImageFragment @arguments(preset: ICON)
				}
			}
		`,
		props.data
	);

	const fragments = [
		...data.imageResource.filter(isNonNullish).map((image) => image),
		...data.definition.imageResource.filter(isNonNullish).map((image) => image),
	];

	const imageData = fragments[0] ?? undefined;
	const image =
		imageData !== undefined ? (
			<AdactaImage
				imageStyle={{ marginRight: 10 }}
				image={imageData}
				alt={`${data.name} preview`}
				icon={true}
			/>
		) : (
			props.fallback ?? null
		);

	return props.asFlexItem ? <EuiFlexItem grow={false}>{image}</EuiFlexItem> : image;
}
