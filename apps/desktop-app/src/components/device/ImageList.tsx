import { EuiFlexItem } from "@elastic/eui";
import React from "react";
import { graphql, useFragment } from "react-relay";

import type { ImageList$key } from "@/relay/ImageList.graphql";
import { AdactaImage } from "~/apps/desktop-app/src/components/image/AdactaImage";
import { wrapWithSuspense } from "~/apps/desktop-app/src/utils/wrapWithSuspense";
import { isNonNullish } from "~/lib/assert/isNonNullish";

interface IProps {
	images: ImageList$key;
	preview?: boolean;
}

export const ImageList = wrapWithSuspense((props: IProps) => {
	const data = useFragment(
		graphql`
			fragment ImageList on HasImageResource {
				name
				imageResource {
					...AdactaImageFragment @arguments(preset: THUMBNAIL)
				}
			}
		`,
		props.images
	);

	return (
		<>
			{data.imageResource.filter(isNonNullish).map((image, i) => (
				<EuiFlexItem grow={false} key={i}>
					<AdactaImage image={image} alt={`${data.name} preview #${i}`} />
				</EuiFlexItem>
			))}
		</>
	);
});
