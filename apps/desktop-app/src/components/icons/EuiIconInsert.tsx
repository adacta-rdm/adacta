import { EuiIcon } from "@elastic/eui";
import type { ComponentProps } from "react";
import React from "react";

import remove from "./assets/insert.svg";

export function EuiIconInsert(props: Omit<ComponentProps<typeof EuiIcon>, "type">) {
	return <EuiIcon {...props} type={remove} />;
}
