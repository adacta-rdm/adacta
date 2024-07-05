import { EuiIcon } from "@elastic/eui";
import type { ComponentProps } from "react";
import React from "react";

import remove from "./assets/remove.svg";

export function EuiIconRemove(props: Omit<ComponentProps<typeof EuiIcon>, "type">) {
	return <EuiIcon {...props} type={remove} />;
}
