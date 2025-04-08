/* eslint-disable relay/unused-fields */
import assert from "assert";

import { groupBy } from "lodash-es";
import type { ReactNode } from "react";
import React, { createContext } from "react";
import { graphql, useFragment } from "react-relay";
import type { ArrayElement } from "type-fest/source/internal";

import { propertyNameToReadableString } from "../../utils/PropertyNameToReadableString";

import type {
	ComponentNodeTreeProviderFragment$data,
	ComponentNodeTreeProviderFragment$key,
} from "@/relay/ComponentNodeTreeProviderFragment.graphql";
import type { DeviceListHierarchicalGraphQLFragment$data } from "@/relay/DeviceListHierarchicalGraphQLFragment.graphql";
import { splitPropertyNameIntoVirtualGroups } from "~/lib/utils/splitPropertyNameIntoVirtualGroups";

const ComponentNodeTreeProviderFragmentGraphQl = graphql`
	fragment ComponentNodeTreeProviderFragment on Device
	@argumentDefinitions(timeFrame: { type: "TimeFrameInput" }, time: { type: "DateTime" }) {
		components(time: $time, timeFrame: $timeFrame, includeOverlaps: true) {
			component {
				__typename
				... on Device {
					id
					name
					displayName
					usagesAsProperty(time: $time, timeFrame: $timeFrame, includeOverlaps: true) {
						id
						device {
							id
						}
						timestamp
						timestampEnd
						name
						value {
							# eslint-disable-next-line relay/must-colocate-fragment-spreads
							...DeviceLink
						}
					}
					definition {
						acceptsUnit
					}
				}
				... on Sample {
					id
					name
					usagesAsProperty(time: $time, timeFrame: $timeFrame, includeOverlaps: true) {
						id
						device {
							id
						}
						timestamp
						timestampEnd
						name
					}
				}
			}
			# eslint-disable-next-line relay/unused-fields
			pathFromTopLevelDevice
		}
	}
`;

interface IProps {
	device: ComponentNodeTreeProviderFragment$key;
	children: ReactNode;
}

interface IContext<T extends ComponentNodeTreeProviderFragmentDataUnion> {
	tree: IComponentTreeNode<T>[];
	components: TComponentOutput<ComponentNodeTreeProviderFragment$data>[];
}

type ComponentNodeTreeProviderFragmentDataUnion =
	| ComponentNodeTreeProviderFragment$data
	| DeviceListHierarchicalGraphQLFragment$data;

/**
 * Generic tree structure that different components can wrap however they want.
 * E.g. the `DeviceOverview` component creates a `EuiTree` while the `SetupDescription` component creates a flat list
 * of tags.
 */
export interface IComponentTreeNode<
	TDatasource extends ComponentNodeTreeProviderFragmentDataUnion
> {
	name: string;
	tag: string; // e.g. 3.1.2
	component: TComponentOutput<TDatasource>["component"];
	children: IComponentTreeNode<TDatasource>[];
}

type TComponent<TDatasource extends ComponentNodeTreeProviderFragmentDataUnion> = ArrayElement<
	TDatasource["components"]
>;

type TComponentOutput<TDatasource extends ComponentNodeTreeProviderFragmentDataUnion> =
	| TComponent<TDatasource>
	| {
			pathFromTopLevelDevice: string[];
			readonly component: { readonly __typename: "virtualGroup"; name?: "Test" };
	  };

export function createVirtualGroups<TDatasource extends ComponentNodeTreeProviderFragmentDataUnion>(
	components: TComponentOutput<TDatasource>[]
): TComponentOutput<TDatasource>[] {
	type TComponentBound = TComponentOutput<TDatasource>;

	const virtualGroupsCreated: string[] = [];

	return [...components].flatMap<TComponentBound>((component): TComponentBound[] => {
		const oldPath = component.pathFromTopLevelDevice;
		const newPath = splitPropertyNameIntoVirtualGroups(oldPath);

		const c: TComponentBound = {
			...component,
			pathFromTopLevelDevice: newPath,
		};

		// If the path changes when splitPropertyNameIntoVirtualGroups is applied then this should
		// be a virtual group
		if (newPath.length !== oldPath.length) {
			const virtualGroupsCausedByThisSlot: TComponentBound[] = [];

			// Loop over paths to ensure that all virtual groups are created
			for (let i = 1; i < newPath.length; i++) {
				const newParentPath = newPath.slice(0, i);
				const identifier = JSON.stringify(newParentPath);
				if (!virtualGroupsCreated.includes(identifier)) {
					const virtualGroup: TComponentBound = {
						pathFromTopLevelDevice: newParentPath,
						component: { __typename: "virtualGroup" },
					};

					virtualGroupsCreated.push(identifier);
					virtualGroupsCausedByThisSlot.push(virtualGroup);
				}
			}

			// Return the virtual group and the component
			return [c, ...virtualGroupsCausedByThisSlot];
		}

		return [c];
	});
}

export function createComponentNodeTree<
	TDatasource extends ComponentNodeTreeProviderFragmentDataUnion
>(c: Readonly<TComponent<TDatasource>[]>, depthString = ""): IComponentTreeNode<TDatasource>[] {
	// Group by first entry of property path. each group with more than one entry becomes a new "folder" in the
	// tree. The resulting object looks like this:
	// {
	//    mfc1: [ {	device: {...}, pathFromTopLevelDevice: ["mfc1"] } ]
	//    ...
	//    cem1: [
	//	    { device: {...}, pathFromTopLevelDevice: ["cem1"] }
	//	    { device: {...}, pathFromTopLevelDevice: ["cem1", "lfc"] }
	//	    { device: {...}, pathFromTopLevelDevice: ["cem1", "mfc"] }
	//    ]
	//    ...
	// }

	const components: TComponentOutput<TDatasource>[] = createVirtualGroups([...c]);
	const grouped = groupBy(components, (d) => d.pathFromTopLevelDevice[0]);

	return (
		Object.values(grouped)
			// Note: Double sort is important to avoid results like this: "Mfc 1", "Mfc 10", "Mfc 2", ...
			// Sorts in the following way:
			// 1. All properties that do not end with a number in alphabetical order.
			// 2. All properties that end with a number:
			//  2.1 Sorted by the whole property name first
			//  2.2 Within the same property name they are sorted by the number at the end
			.sort((a, b) => {
				return propertyNameToReadableString(a[0].pathFromTopLevelDevice[0]).localeCompare(
					propertyNameToReadableString(b[0].pathFromTopLevelDevice[0])
				);
			})
			.sort((a, b) => {
				const endNumberA = Number(
					propertyNameToReadableString(a[0].pathFromTopLevelDevice[0]).split(" ").slice(-1)[0]
				);
				const endNumberB = Number(
					propertyNameToReadableString(b[0].pathFromTopLevelDevice[0]).split(" ").slice(-1)[0]
				);
				if (isNaN(endNumberA) && !isNaN(endNumberB)) return -1;
				if (isNaN(endNumberB) && !isNaN(endNumberA)) return 1;
				if (!isNaN(endNumberA) && !isNaN(endNumberB))
					return Number(endNumberA) - Number(endNumberB);
				return propertyNameToReadableString(a[0].pathFromTopLevelDevice[0]).localeCompare(
					propertyNameToReadableString(b[0].pathFromTopLevelDevice[0])
				);
			})
			.flatMap((subComponentsWithPath: TComponentOutput<TDatasource>[], i) => {
				const topLevelSubComponentsWithPath: TComponentOutput<TDatasource>[] =
					subComponentsWithPath.filter((sc) => sc.pathFromTopLevelDevice.length === 1);

				const results: IComponentTreeNode<TDatasource>[] = [];

				for (const topLevelSubComponentWithPath of topLevelSubComponentsWithPath) {
					const component = topLevelSubComponentWithPath.component;

					const tag = `${depthString}${String(i + 1)}`;
					assert(component.__typename !== "%other");

					if (topLevelSubComponentWithPath.pathFromTopLevelDevice.length === 0) {
						continue;
					}

					// TODO: Remove propertyNameToReadableString
					const name = propertyNameToReadableString(
						topLevelSubComponentWithPath.pathFromTopLevelDevice[0]
					);

					const children =
						subComponentsWithPath.length === 1
							? []
							: createComponentNodeTree(
									subComponentsWithPath
										.filter((sd) => sd.pathFromTopLevelDevice.length > 1)
										.map((sd) => ({
											...sd,
											pathFromTopLevelDevice: sd.pathFromTopLevelDevice.slice(1),
										})) as TComponent<TDatasource>[],
									`${depthString + String(i + 1)}.`
							  );

					// Casting here is necessary because the type of the children property is
					// somehow not correctly inferred (and is never)
					// I think it is related to the recursive nature of the type or something
					// regarding the difference between `(A|B)[]` and `A[] | B[]`
					const newElement: IComponentTreeNode<TDatasource> = {
						name,
						tag,
						component: component,
						children: children,
					} as IComponentTreeNode<TDatasource>;

					results.push(newElement);
				}
				return results;
			})
	);
}

const TreeContext = createContext<IContext<ComponentNodeTreeProviderFragment$data> | null>(null);

export function ComponentNodeTreeProvider(props: IProps) {
	const data = useFragment(ComponentNodeTreeProviderFragmentGraphQl, props.device);
	const tree = createComponentNodeTree<ComponentNodeTreeProviderFragment$data>(data.components);

	const components = createVirtualGroups<ComponentNodeTreeProviderFragment$data>([
		...data.components,
	]);

	return (
		<TreeContext.Provider value={{ tree, components: components }} {...props}>
			{props.children}
		</TreeContext.Provider>
	);
}

export function useTree() {
	const context = React.useContext(TreeContext);
	if (!context) {
		throw new Error(`useTree must be used within a ComponentNodeTreeProvider`);
	}
	return context;
}
