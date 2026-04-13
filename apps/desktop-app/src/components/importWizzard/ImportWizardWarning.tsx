import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer } from "@elastic/eui";
import React from "react";
import { graphql, useMutation } from "react-relay";

import type { ImportWizardWarningImportWithWarningsResolutionMutation } from "@/relay/ImportWizardWarningImportWithWarningsResolutionMutation.graphql";
import { useRepositoryId } from "~/apps/desktop-app/src/services/router/UseRepoId";
import { isNonNullish } from "~/lib/assert";

const collapseCount = 3;

const ImportWithWarningsResolutionMutation = graphql`
	mutation ImportWizardWarningImportWithWarningsResolutionMutation(
		$repositoryId: ID!
		$input: ImportWithWarningsResolutionInput!
	) {
		repository(id: $repositoryId) {
			importWithWarningsResolution(input: $input) {
				ids
			}
		}
	}
`;

export function ImportWizardWarning(props: {
	warnings: string[] | undefined;

	/**
	 * If some resources were imported with warnings, their ids can be passed here to show the user which ones were
	 * affected and allow them to decide what to do with them.
	 */
	resourcesImportedWithWarnings?: string[];

	onResolved?: (keepImportedResources: boolean, ids: string[]) => void;
}) {
	const repositoryId = useRepositoryId();
	const [collapsed, setCollapsed] = React.useState(true);
	const { warnings } = props;

	const importPending = (props.resourcesImportedWithWarnings?.length ?? 0) > 0;

	const [commitResolve, isInFlight] =
		useMutation<ImportWizardWarningImportWithWarningsResolutionMutation>(
			ImportWithWarningsResolutionMutation
		);

	const resolve = (keepImportedResources: boolean) => {
		const resourceIds = props.resourcesImportedWithWarnings ?? [];
		if (resourceIds.length === 0) return;

		commitResolve({
			variables: {
				repositoryId,
				input: { resourceIds, keepImportedResources },
			},
			onCompleted: (r) => {
				const ids = r.repository.importWithWarningsResolution.ids;
				props.onResolved?.(keepImportedResources, ids.filter(isNonNullish));
			},
		});
	};

	if (!warnings || warnings.length === 0) return null;

	const showMoreCount = warnings.length - collapseCount;

	return (
		<>
			<EuiCallOut title="Warning" color="warning" iconType="help">
				{importPending && <p>The following warnings occurred while importing: </p>}

				{warnings.slice(0, collapsed ? collapseCount : warnings.length).map((w, i) => (
					<p key={`${w}${i}`}>{w}</p>
				))}
				{showMoreCount > 0 && (
					<EuiLink onClick={() => setCollapsed(!collapsed)} color={"subdued"}>
						{collapsed
							? `Show ${showMoreCount} more warnings`
							: `Hide all but ${collapseCount} warnings`}
					</EuiLink>
				)}

				{importPending && (
					<EuiFlexGroup>
						<EuiFlexItem grow={false}>
							<EuiButton color={"success"} onClick={() => resolve(true)} disabled={isInFlight}>
								Continue & Save Resource with warnings
							</EuiButton>
						</EuiFlexItem>
						<EuiFlexItem grow={false}>
							<EuiButton color={"danger"} onClick={() => resolve(false)} disabled={isInFlight}>
								Cancel / Delete
							</EuiButton>
						</EuiFlexItem>
					</EuiFlexGroup>
				)}
			</EuiCallOut>
			<EuiSpacer />
		</>
	);
}
