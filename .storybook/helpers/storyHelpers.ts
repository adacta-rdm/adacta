import { FragmentRefs } from "relay-runtime";
import { Spread } from "type-fest";

import { Changelog } from "~/apps/desktop-app/src/components/changelog/Changelog";
import { DeviceLink } from "~/apps/desktop-app/src/components/device/DeviceLink";

const components = [Changelog, DeviceLink] as const;
type Components = typeof components;

type FragmentsTuple = RelayDataFromComponent<Components[number]>;

export type ResolvedFragmentProps<T1 extends (...args: any) => any> =
	ReplaceFragmentSpreadsRecursive<RelayDataFromComponent<T1>>;

export function fragmentRef<T1 extends (...args: any) => any>(
	Component: T1,
	arg: {
		// TODO: Do not hardcode the data prop
		data: ReplaceFragmentSpreadsRecursive<RelayDataFromComponent<T1>>;
	}
): Parameters<T1>[0] {
	return arg as never;
}

type ReplaceFragmentSpreadsRecursive<T> = T extends object
	? {
			[K in keyof InsertFragmentSpreads<T>]: ReplaceFragmentSpreadsRecursive<
				InsertFragmentSpreads<T>[K]
			>;
	  }
	: T;

type InsertFragmentSpreads<T extends object> = OmitRelayTypes<
	Spread<T, FragmentTypeByName<FragmentSpreadName<T>>>
>;

type RelayDataFromComponent<
	T extends (...args: any) => any,
	TKey extends string = "data"
> = NonNullable<Parameters<T>[0][TKey][" $data"]>;

type FragmentTypeByName<K> = Extract<FragmentsTuple, { " $fragmentType": K }>;

type FragmentSpreadName<T> = T extends {
	" $fragmentSpreads": FragmentRefs<infer TName>;
}
	? TName
	: string;

type OmitRelayTypes<T> = Omit<T, " $fragmentType" | " $fragmentSpreads">;
