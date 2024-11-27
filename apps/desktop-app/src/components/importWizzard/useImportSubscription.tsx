import assert from "assert";

import { useMemo } from "react";
import { graphql, useSubscription } from "react-relay";
import type { GraphQLSubscriptionConfig } from "relay-runtime";

import type { IRouter } from "../../hooks/useRouter";

import type { useImportSubscription as SubscriptionType } from "@/relay/useImportSubscription.graphql";
import { assertUnreachable, isNonNullish } from "~/lib/assert";

export const ImportSubscriptionGraphQL = graphql`
	subscription useImportSubscription {
		importTask {
			id
			payload {
				__typename
				... on ImportTransformationProgress {
					progress
				}
				... on ImportTransformationSuccess {
					ids
				}
				... on ImportTransformationError {
					message
				}
				... on ImportTransformationWarning {
					message
				}
			}
		}
	}
`;

export function useImportSubscription(options: {
	taskId: string | undefined;
	router: IRouter;
	resourceId: string;
	repositoryId: string;
	setProgress: (p: number) => void;
	setImportRunning: (r: boolean) => void;
	setWarning: (w: string[]) => void;
	setErrors: (e: string[]) => void;
}) {
	const {
		taskId,
		router,
		resourceId,
		repositoryId,
		setProgress,
		setImportRunning,
		setWarning,
		setErrors,
	} = options;
	// IMPORTANT: your config should be memoized, or at least not re-computed
	// every render. Otherwise, useSubscription will re-render too frequently.
	const config: GraphQLSubscriptionConfig<SubscriptionType> = useMemo(() => {
		return {
			variables: {},
			onNext: (r) => {
				if (taskId !== undefined && r?.importTask?.id === taskId) {
					const { payload } = r.importTask;

					assert(payload.__typename !== "%other");

					switch (payload.__typename) {
						case "ImportTransformationProgress": {
							if (payload.progress != undefined) setProgress(payload.progress);
							break;
						}
						case "ImportTransformationSuccess": {
							const ids = payload.ids;
							if (ids.length == 1 && ids[0] !== null) {
								router.push("/repositories/:repositoryId/resources/:resourceId", {
									repositoryId,
									resourceId: ids[0],
								});
							} else {
								router.push("/repositories/:repositoryId/resources/:resourceId", {
									repositoryId,
									resourceId: resourceId,
								});
							}
							break;
						}
						case "ImportTransformationWarning": {
							setImportRunning(false);
							setWarning(payload.message.filter(isNonNullish));
							break;
						}
						case "ImportTransformationError": {
							setImportRunning(false);
							setErrors(payload.message.filter(isNonNullish));
							break;
						}
						default:
							assertUnreachable(payload);
					}
				}
			},
			subscription: ImportSubscriptionGraphQL,
		};
	}, [
		taskId,
		setProgress,
		router,
		repositoryId,
		resourceId,
		setImportRunning,
		setWarning,
		setErrors,
	]);
	useSubscription(config);
}
