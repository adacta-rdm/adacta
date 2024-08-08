import type React from "react";
import { useContext } from "react";

export function useSearchBarContext<T>(searchBarContext: React.Context<{ refetch?: T }>) {
	const context = useContext(searchBarContext);
	if (context.refetch === undefined) {
		throw new Error("refetch in SearchBarContext is not set");
	}

	return context.refetch;
}
