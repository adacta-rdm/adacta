import { EuiButton } from "@elastic/eui";
import type { EuiButtonPropsForButton } from "@elastic/eui/src/components/button/button";
import React from "react";

import { useRouter } from "../../../hooks/useRouter";

export function Logout(props: EuiButtonPropsForButton) {
	const { router } = useRouter();

	return (
		<EuiButton {...props} onClick={() => router.push("/logout")}>
			Logout
		</EuiButton>
	);
}
