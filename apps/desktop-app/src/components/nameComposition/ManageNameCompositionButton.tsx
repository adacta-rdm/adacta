import { EuiButtonEmpty } from "@elastic/eui";
import React from "react";

import { useRepoRouterHook } from "../../services/router/RepoRouterHook";

export function ManageNameCompositionButton() {
	const { router, repositoryId } = useRepoRouterHook();

	return (
		<EuiButtonEmpty
			onClick={() => {
				router.push("/repositories/:repositoryId/nameComposition/", { repositoryId });
			}}
		>
			Manage Naming Schemes
		</EuiButtonEmpty>
	);
}
