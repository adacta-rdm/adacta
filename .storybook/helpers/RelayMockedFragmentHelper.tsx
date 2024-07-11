import type { StoryObj } from "@storybook/react";
import React, { Suspense } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { useLazyLoadQuery } from "react-relay";
import type { OperationType } from "relay-runtime";

import type { TypedMockResolvers } from "./RelayMockedDataProvider";
import { RelayMockedDataProvider } from "./RelayMockedDataProvider";

// Wraps component to fetch required fragment
// Can't be inlined into RelayMockedFragmentHelper as useLazyLoadQuery suspends the component (and that would
// cause RelayMockedFragmentHelper itself to suspend)
function DataLoaderHelper<TQuery extends OperationType>(props: {
	query: GraphQLTaggedNode;
	child: (data: TQuery["response"]) => JSX.Element;
}) {
	// Not really sure why it is needed but setting a custom fetchKey forces storybook to fetch new data (without hard
	// refresh)
	// const options: Parameters<typeof useLazyLoadQuery<TQuery>>[2] = {
	// 	fetchPolicy: "network-only",
	// 	fetchKey: Math.random(),
	// };

	const data = useLazyLoadQuery<TQuery>(props.query, {}, {});
	return props.child(data);
}

/**
 * Helper which can be used to render a component which requires a fragment
 * See RelayMockedDataProvider for `mockResolvers` syntax {@link RelayMockedDataProvider}
 */
export function RelayMockedFragmentHelper<TQuery extends OperationType>(props: {
	query: GraphQLTaggedNode;
	mockResolvers?: TypedMockResolvers;
	renderTestSubject: (data: TQuery["response"]) => JSX.Element;
	addDelayToNonInitialOperations?: number;
}) {
	return (
		<RelayMockedDataProvider
			mockResolvers={props.mockResolvers}
			addDelayToNonInitialOperations={props.addDelayToNonInitialOperations}
		>
			<Suspense fallback={<>Loading mocked data...</>}>
				<DataLoaderHelper query={props.query} child={props.renderTestSubject} />
			</Suspense>
		</RelayMockedDataProvider>
	);
}

export type RelayMockedFragmentHelperStory<T> = T extends OperationType
	? StoryObj<typeof RelayMockedFragmentHelper<T>>
	: never;
