import type { FarceStoreExtension } from "farce";
import type { FoundStoreExtension, Matcher } from "found";
import { useRouter as useFoundRouter } from "found";
import { useMemo } from "react";

import type { RouterArgs } from "../routes";
import { resolveLocation } from "../routes/utils/resolveLocation";
import { useService } from "../services/ServiceProvider";
import { HistoryService } from "../services/history/HistoryService";

/**
 * Returns a type safe router.
 */
export function useRouter() {
	const { match, router } = useFoundRouter();
	const history = useService(HistoryService);

	return useMemo(
		() => ({
			match,
			router: {
				push(...args: RouterArgs) {
					history.push(...args);
					return router.push(resolveLocation(...args));
				},
				replace(...args: RouterArgs) {
					history.push(...args);
					return router.replace(resolveLocation(...args));
				},

				go(delta: number) {
					return router.go(delta);
				},

				get isActive() {
					return router.isActive;
				},
			} as IRouter,
		}),
		[match, router, history]
	);
}

interface IRouter extends FarceStoreExtension, FoundStoreExtension {
	/**
	 * Navigates to a new location
	 * @see farce
	 */
	push: (...args: RouterArgs) => void;

	/**
	 * Replace the current history entry
	 * @see farce
	 */
	replace: (...args: RouterArgs) => void;
	/**
	 * Moves delta steps in the history stack
	 * @see farce
	 */
	go: (delta: number) => void;

	isActive: Matcher["isActive"];
}
