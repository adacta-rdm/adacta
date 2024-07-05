/**
 * This function returns true if the GraphQL type represents a resource which is known to the user
 * as resource.
 *
 * This is necessary because not everything that is managed internally as a resource is also visible
 * to the user as a resource. For example, presets and images are resources, but they are never
 * labeled as such from the user's point of view.
 */
export function isKnownAsResourceToUser(obj: { __typename: string }) {
	return obj.__typename === "ResourceTabularData" || obj.__typename === "ResourceGeneric";
}
