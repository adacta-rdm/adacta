import assert from "assert";

import React from "react";
import { graphql, useFragment } from "react-relay";

import type { TopLevelDevice$key } from "@/relay/TopLevelDevice.graphql";
import { DeviceLink } from "~/apps/desktop-app/src/components/device/DeviceLink";

export function TopLevelDevice(props: { data: TopLevelDevice$key }) {
	const data = useFragment(
		graphql`
			fragment TopLevelDevice on Node {
				... on Device {
					__typename
					topLevelDevice {
						path
						device {
							...DeviceLink
						}
					}
				}
				... on Sample {
					__typename
					topLevelDevice {
						path
						device {
							...DeviceLink
						}
					}
				}
			}
		`,
		props.data
	);

	assert(data.__typename === "Device" || data.__typename === "Sample");

	const d = data.topLevelDevice;

	if (d) {
		return (
			<>
				<br />
				<span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
					Currently installed in setup: <DeviceLink data={d.device} /> ({d.path.join(" / ")})
				</span>
			</>
		);
	}
}
