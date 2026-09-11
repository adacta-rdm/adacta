import type { PrepareImageTaskArgs } from "./productionRoots";

export interface Generic<T> {
	value: T;
}

export interface GenericWithExternalType {
	a: Generic<string>;
	b: PrepareImageTaskArgs;
}
