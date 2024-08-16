import type { GraphQLTaggedNode } from "react-relay";
import { useMutation } from "react-relay";
import type { UseMutationConfig } from "react-relay/hooks";
import type { MutationParameters } from "relay-runtime";

export function useMutationPromise<TMutation extends MutationParameters>(
	mutation: GraphQLTaggedNode
) {
	const [doCommit, isInFlight] = useMutation<TMutation>(mutation);

	function commit(
		// variables: VariablesOf<TMutation>
		config: UseMutationConfig<TMutation>
	): Promise<TMutation["response"]> {
		return new Promise((resolve, reject) => {
			doCommit({
				...config,
				onCompleted: (response, errors) => {
					if (config.onCompleted) {
						config.onCompleted(response, errors);
					}
					resolve(response);
				},
				onError: (error) => {
					if (config.onError) {
						config.onError(error);
					}
					reject(error);
				},
			});
		});
	}

	return [commit, isInFlight] as const;
}
