import type { Tagged } from "type-fest";

/**
 * A source module path relative to the project root and without an extension.
 *
 * @example
 * `lib/interface/IHTTPEndpointArgs.ts` becomes
 * `lib/interface/IHTTPEndpointArgs`.
 */
export type ModulePath = Tagged<string, "ModulePath">;
