import { makeDecorator } from "@storybook/preview-api";
import type { ComponentProps, ComponentType, JSX } from "react";
import { RelayEnvironmentProvider, useLazyLoadQuery } from "react-relay";
import type {
	GraphQLSingularResponse,
	GraphQLTaggedNode,
	OperationDescriptor,
	OperationType,
} from "relay-runtime";
import { createMockEnvironment, MockPayloadGenerator } from "relay-test-utils";
import type {
	MockResolverContext,
	MockResolvers,
} from "relay-test-utils/lib/RelayMockPayloadGenerator";
import type { OperationMockResolver } from "relay-test-utils/lib/RelayModernMockEnvironment";
import seedrandom from "seedrandom";
import type { PartialDeep } from "type-fest";

import { defaultMockResolvers } from "~/.storybook/relay/defaultMockResolvers";
import type { IResolversTypes } from "~/apps/repo-server/src/graphql/generated/resolvers";

export type TypeMockResolverContext = MockResolverContext & {
	random: ReturnType<typeof getRandomNumberHelpers>;
};

/**
 * Replacement type for relay's MockResolvers type with more type-safeness from the generated
 * types
 */
export type TypedMockResolvers = {
	[K in keyof IResolversTypes]?: (
		context: TypeMockResolverContext,
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
	 * Optional. If specified, the story will suspend for the specified number of milliseconds.
	 * Useful for testing loading states.
	 */
	delay?: number;

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
			environment.mock.queueOperationResolver(((operation) => {
				// A response must be explicitly configured for each graphql operation. To enable multiple
				// operations in a single story (e.g., due to user interaction), we queue up the same
				// response each time a new operation is requested, hence the recursive call here.
				setupNextGraphQLResponse();

				const response = parameters.generateFunction
					? parameters.generateFunction(operation, resolvers)
					: MockPayloadGenerator.generate(operation, resolvers);

				if (parameters.delay === undefined) return response;

				// In case `delay` is set, we wrap the response in a promise that resolves after the
				// specified number of milliseconds.
				return new Promise((resolve) => {
					setTimeout(() => resolve(response), parameters.delay);
				});
			}) as OperationMockResolver);
		};

		setupNextGraphQLResponse();

		return (
			<RelayEnvironmentProvider environment={environment}>
				<Renderer />
			</RelayEnvironmentProvider>
		);
	},
});

function mergeResolvers(mockResolvers: TypedMockResolvers = {}): MockResolvers {
	const resolvers: MockResolvers = {};

	const random = getRandomNumberHelpers();
	const defaultResolvers: TypedMockResolvers = defaultMockResolvers();

	for (const type of new Set([
		...Object.keys(defaultResolvers),
		...Object.keys(mockResolvers),
	] as (keyof TypedMockResolvers)[])) {
		const fnCustom = mockResolvers[type];
		const fnDefault = defaultResolvers[type];

		if (fnDefault && fnCustom) {
			resolvers[type] = (ctxPristine, id) => {
				const ctx = { ...ctxPristine, random };

				const resultDefault = fnDefault(ctx, id);
				const resultCustom = fnCustom(ctx, id);

				if (!(typeof resultDefault === "object" && typeof resultCustom === "object")) {
					throw new Error(
						"One of the Mock resolvers (default/custom) didn't return an object. Currently there is no merging logic for this case."
					);
				}

				return { ...resultDefault, ...resultCustom };
			};
		} else if (fnDefault) {
			resolvers[type] = (ctx, id) => fnDefault({ ...ctx, random }, id);
		} else if (fnCustom) {
			resolvers[type] = (ctx, id) => fnCustom({ ...ctx, random }, id);
		}
	}

	return resolvers;
}

function getRandomNumberHelpers() {
	const random = seedrandom("ADACTA_STATIC_SEED");

	return Object.assign(random, {
		intBetween(min: number, max: number) {
			min = Math.ceil(min);
			max = Math.floor(max);
			return Math.floor(random() * (max + 1 - min) + min);
		},

		itemFrom<T>(items: T[]): T {
			return items[Math.floor(random() * items.length)];
		},

		array<T>(min: number, max: number, fill: T = {} as T) {
			return Array(this.intBetween(min, max)).fill(fill) as T[];
		},
	});
}
