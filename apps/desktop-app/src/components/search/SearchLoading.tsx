import { EuiSkeletonText } from "@elastic/eui";
import React from "react";

export function SearchLoading() {
	return <EuiSkeletonText lines={4} />;
}
