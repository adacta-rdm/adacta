import { EuiToken } from "@elastic/eui";
import React from "react";

export function getTokenByType(type: string) {
	if (type === "Device") return <EuiToken iconType="tokenStruct" />;
	if (type === "Sample") return <EuiToken iconType="tokenPercolator" />;
	throw new Error("getTokenByType: Unknown property type");
}
