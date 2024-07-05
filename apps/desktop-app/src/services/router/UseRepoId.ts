import { assertDefined } from "@omegadot/assert";
import { useRouter } from "found";
import { createContext, useContext, useMemo } from "react";

/**
 * In most cases the repositoryId can be extracted from the current route.
 * In some cases (e.g. when the welcome screen is shown) the repositoryId is not part of the route.
 * In this case RepositoryContext.Provider can be used to provide the repositoryId to all child
 * components.
 *
 * For now this is only required for the DeviceLink (as it renders a popover preview of the device)
 * all other *Link components only require the repositoryId to build the url (and aren't rendering
 * any child components).
 */
export const RepositoryContext = createContext<string | undefined>(undefined);

export function useRepositoryIdMaybe(): string | undefined {
	const router = useRouter();
	const context = useContext(RepositoryContext);
	return useMemo(() => {
		const repositoryId = router.match.params.repositoryId ?? context;
		return repositoryId;
	}, [router.match.params, context]);
}

export function useRepositoryId(): string {
	const repositoryId = useRepositoryIdMaybe();
	const router = useRouter();
	assertDefined(
		repositoryId,
		`repositoryId is not defined. Route is: ${router.match.location.pathname}`
	);
	return repositoryId;
}

export function useRepositoryIdVariable() {
	const repositoryId = useRepositoryId();
	return useMemo(() => ({ repositoryId }), [repositoryId]);
}
