declare module "@/tsrc/types" {
	export function isTest(arg: unknown): boolean;
}

declare module "@/tsrc/missing" {
	export const missing: unknown;
}

declare module "@/tsrc/validatorImports" {
	export function isGenericWithExternalType(arg: unknown): boolean;
}
