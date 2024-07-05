import type { IResolvers } from "./generated/resolvers";

/**
 * Helper type for extracting the defined resolvers from the generated resolvers.
 * Can be used when a defined resolver needs to be returned from another resolver (i.e.
 * repository() returns a RepositoryQuery resolver in which case it is important that the resolver
 * is defined).
 */
export type IDefinedResolver<T extends keyof IResolvers> = Exclude<IResolvers[T], undefined>;
