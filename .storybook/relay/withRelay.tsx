import { makeDecorator } from "@storybook/preview-api";
import type { ComponentProps, ComponentType } from "react";
import type { JSX } from "react";
import { RelayEnvironmentProvider, useLazyLoadQuery } from "react-relay";
import type {
	GraphQLSingularResponse,
	GraphQLTaggedNode,
	OperationDescriptor,
	OperationType,
} from "relay-runtime";
import { createMockEnvironment, MockPayloadGenerator } from "relay-test-utils";
import type {
	MockResolver,
	MockResolverContext,
	MockResolvers,
} from "relay-test-utils/lib/RelayMockPayloadGenerator";
import type { PartialDeep } from "type-fest";

import { defaultMockResolvers } from "~/.storybook/relay/defaultMockResolvers";
import type { IResolversTypes } from "~/apps/repo-server/src/graphql/generated/resolvers";

/**
 * Replacement type for relay's MockResolvers type with more type-safeness from the generated
 * types
 */
export type TypedMockResolvers = {
	[K in keyof IResolversTypes]?: (
		context: MockResolverContext,
		generateId: () => number
	) =>
		| (PartialDeep<Omit<IResolversTypes[K], "id">> & { id?: string })
		// Undefined is allowed as return type for resolvers which don't want to intercept (i.e.
		// depending on the context
		| undefined;
};

export interface IWithRelayParameters<
	T extends { component: ComponentType<any> },
	TQuery extends OperationType = OperationType
> {
	/**
	 * A GraphQLTaggedNode returned by the relay's graphql`...` template literal.
	 */
	query?: GraphQLTaggedNode;

	/**
	 * Optional. Variables to pass to the query.
	 */
	variables?: TQuery["variables"];

	/**
	 * Optional. Mock resolver object pass to the relay-test-utils MockPayloadGenerator.generate function.
	 * If you use TResolver type argument, you can get type safety <3
	 */
	mockResolvers?: TypedMockResolvers;

	/**
	 * Optional. A function to execute instead of the default MockPayloadGenerator.generate function.
	 */
	generateFunction?: (
		operation: OperationDescriptor,
		mockResolvers?: MockResolvers | null
	) => GraphQLSingularResponse;

	/**
	 * If specified, issues a lazy load query and passes the result to the story. The object's
	 * keys are the story's args, and the values are functions that return the corresponding
	 * values from the query result.
	 *
	 * If `props` are not specified, it is assumed that the Story will issue a query itself. In
	 * this case, the mock resolvers are only configured to return data for that query, but no
	 * query is actually issued.
	 */
	props?: {
		[P in keyof Partial<ComponentProps<T["component"]>>]: (
			queryResult: TQuery["response"]
		) => ComponentProps<T["component"]>[P];
	};
}

export const withRelay = makeDecorator({
	name: "withRelay",
	parameterName: "relay",

	// This decorator will only come into effect if the "relay" parameter is set
	skipIfNoParametersOrOptions: true,
	wrapper: (getStory, context, settings) => {
		const parameters = settings.parameters as IWithRelayParameters<any>;

		const { query, props, variables = {}, mockResolvers = {} } = parameters;

		if (!query) {
			throw new Error("The 'query' parameter is required for the 'withRelay' decorator.");
		}

		const resolvers = mergeResolvers(mockResolvers);

		const Renderer = props
			? () => {
					const queryResult = useLazyLoadQuery(query, variables);

					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					const entries = Object.entries(props).map(([prop, fn]) => [prop, fn(queryResult)]);
					Object.assign(context.args, Object.fromEntries(entries));

					return getStory(context) as JSX.Element;
			  }
			: () => getStory(context) as JSX.Element;

		const environment = createMockEnvironment();

		const setupNextGraphQLResponse = () => {
			environment.mock.queueOperationResolver((operation) => {
				// A response must be explicitly configured for each graphql operation. To enable multiple
				// operations in a single story (e.g., due to user interaction), we queue up the same
				// response each time a new operation is requested, hence the recursive call here.
				setupNextGraphQLResponse();

				if (parameters.generateFunction) {
					return parameters.generateFunction(operation, resolvers);
				}
				return MockPayloadGenerator.generate(operation, resolvers);
			});

			environment.mock.queuePendingOperation(query, variables);
		};

		setupNextGraphQLResponse();

		return (
			<RelayEnvironmentProvider environment={environment}>
				<Renderer />
			</RelayEnvironmentProvider>
		);
	},
});

function mergeResolvers(mockResolvers: TypedMockResolvers = {}) {
	const merged: MockResolvers = defaultMockResolvers;

	for (const type of Object.keys(mockResolvers)) {
		const fnCustom = mockResolvers[type as keyof TypedMockResolvers];
		if (!fnCustom) continue;

		const fnDefault = merged[type] as MockResolver | undefined;
		if (!fnDefault) {
			merged[type] = fnCustom;
			continue;
		}

		merged[type] = (ctx, id) => {
			const resultDefault = fnDefault(ctx, id);
			const resultCustom = fnCustom(ctx, id);

			if (!(typeof resultDefault === "object" && typeof resultCustom === "object")) {
				throw new Error(
					"One of the Mock resolvers (default/custom) didn't return an object. Currently there is no merging logic for this case."
				);
			}

			return { ...resultDefault, ...resultCustom };
		};
	}

	return merged;
}
