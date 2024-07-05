import { IResolversTypes } from "~/apps/repo-server/src/graphql/generated/resolvers";
import React, { PropsWithChildren, useCallback } from "react";
import { useRelayEnvironment } from "react-relay";
import { OperationDescriptor, RelayEnvironmentProvider } from "react-relay/hooks";
import { GraphQLResponse } from "relay-runtime";
import { MockPayloadGenerator } from "relay-test-utils";
import {
	MockResolver,
	MockResolverContext,
	MockResolvers,
} from "relay-test-utils/lib/RelayMockPayloadGenerator";
import { RelayMockEnvironment } from "relay-test-utils/lib/RelayModernMockEnvironment";
import { PartialDeep } from "type-fest";

import { defaultMocks } from "./projectConfig";

type AsyncOperationMockResolver = (
	operation: OperationDescriptor
) => Promise<GraphQLResponse | Error | null>;

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

/**
 * Provides a relay environment where mocked data is returned.
 *
 * Additional mocks can be supplied using the `mockResolvers` property.
 * These mock resolvers will be combined with project specific `defaultMocks`. See projectConfig.ts
 *
 * Currently, this component needs to be wrapped in a RelayEnvironmentProvider (in an attempt to
 * make it compatible to other mock/testing strategies)
 *
 * @see {@link https://relay.dev/docs/guides/testing-relay-components/#mock-payload-generator-and-the-relay_test_operation-directive|relay.dev Mock Resolvers}
 *
 */
export function RelayMockedDataProvider({
	children,
	mockResolvers,
	addDelayToNonInitialOperations,
}: PropsWithChildren<{
	mockResolvers?: TypedMockResolvers | undefined;
	addDelayToNonInitialOperations?: number;
}>) {
	const environment = useRelayEnvironment() as unknown as RelayMockEnvironment;
	const resolver = useCallback(
		(operation: OperationDescriptor) => {
			// Globally defined resolvers
			const defaultFns = new Map<string, MockResolver>();

			// Custom resolver passed by story
			const customFns = new Map<string, MockResolver>();

			const types = [];

			for (const [type, Fn] of Object.entries(defaultMocks)) {
				defaultFns.set(type, Fn);
				types.push(type);
			}
			if (mockResolvers) {
				for (const [type, Fn] of Object.entries(mockResolvers)) {
					customFns.set(type, Fn);
					types.push(type);
				}
			}

			// Try to merge return value of default resolver with return value of custom resolver
			const mergedResolvers: MockResolvers = Object.fromEntries(
				types.map((type) => {
					return [
						type,
						(ctx, id) => {
							const defaultFn = defaultFns.get(type);
							const customFn = customFns.get(type);

							let ret = undefined;
							if (defaultFn) {
								ret = defaultFn(ctx, id);
							}

							// Return default resolver return value if no custom resolver is set
							if (!customFn) {
								return ret;
							}

							// If custom resolver is set try to execute

							const retCustom = customFn(ctx, id);
							if (retCustom === undefined) {
								return ret;
							} else {
								// Merge both return values
								const resultDefault = ret ?? {};
								if (typeof resultDefault === "object" && typeof retCustom === "object") {
									return { ...resultDefault, ...retCustom };
								} else {
									throw new Error(
										"One of the Mock resolvers (default/custom) didn't return an object. Currently there is no merging logic for this case."
									);
								}
							}
						},
					];
				})
			);

			//const mergedResolvers = { ...defaultMocks, ...mockResolvers }

			return MockPayloadGenerator.generate(operation, mergedResolvers);
		},
		[mockResolvers]
	);

	for (let i = 0; i < 256; i++) {
		// relay-test-utils are used to create this Mock environment. Since that library is meant
		// to be used by tests there are only options to handle single operations and no way to add
		// a resolver for all operations.
		// This loop adds the resolver 2^8 times to answer 2^8 operations
		//
		// NOTE: If multiple resolvers are equal they'll get removed from the queue after one
		// execution. For this reason this loop adds "unique" lambdas.
		const asyncResolver: AsyncOperationMockResolver = async (operation) => {
			const data = resolver(operation);

			if (i > 0 && addDelayToNonInitialOperations != undefined) {
				await new Promise((resolve) => setTimeout(resolve, addDelayToNonInitialOperations));
			}
			return data;
		};

		type OperationMockResolver = Parameters<typeof environment.mock.queueOperationResolver>[0];
		environment.mock.queueOperationResolver(asyncResolver as unknown as OperationMockResolver);
	}

	return <RelayEnvironmentProvider environment={environment}>{children}</RelayEnvironmentProvider>;
}
