import { assertDefined } from "@omegadot/assert";
import { uniqBy } from "lodash";

import type { RouteParams } from "../../RouteParams";

import type { RouterArgs } from "@/routes";

export class HistoryService {
	private static HISTORY_SERVICE_KEY_OLD = "HISTORY_SERVICE_V2";
	private static HISTORY_SERVICE_KEY = "HISTORY_SERVICE_V3";
	private static HISTORY_SERVICE_HISTORY = "_HISTORY";
	private static HISTORY_SERVICE_FAVORITES = "_FAVORITES";
	private static HISTORY_SERVICE_FREQUENCY = "_FREQ";

	private static HISTORY_STORAGE_SIZE = 100;

	// IDs of the most recently visited "things"
	private readonly history: { id: string; repositoryId: string }[] = [];

	// IDs of the favorite "things"
	private readonly favorites: { id: string; repositoryId: string }[] = [];

	// Maps a Document ID to the frequency in the history
	private readonly frequencyMap = new Map<string, { count: number; repositoryId: string }>();

	constructor() {
		// Remove stored items in legacy format
		localStorage.removeItem(
			HistoryService.HISTORY_SERVICE_KEY_OLD + HistoryService.HISTORY_SERVICE_HISTORY
		);
		localStorage.removeItem(
			HistoryService.HISTORY_SERVICE_KEY_OLD + HistoryService.HISTORY_SERVICE_FAVORITES
		);
		localStorage.removeItem(
			HistoryService.HISTORY_SERVICE_KEY_OLD + HistoryService.HISTORY_SERVICE_FREQUENCY
		);

		// Restore History
		this.history =
			HistoryService.loadArrayFromStorage(HistoryService.HISTORY_SERVICE_HISTORY) ?? [];

		this.favorites =
			HistoryService.loadArrayFromStorage(HistoryService.HISTORY_SERVICE_FAVORITES) ?? [];

		// Restore Frequency
		const storedFrequency = localStorage.getItem(
			HistoryService.HISTORY_SERVICE_KEY + HistoryService.HISTORY_SERVICE_FREQUENCY
		);
		if (storedFrequency !== null) {
			this.frequencyMap = new Map(JSON.parse(storedFrequency));
		}
	}

	push(...args: RouterArgs) {
		const params: RouteParams = args[1] ?? {};

		const repositoryId = params.repositoryId;
		const id = params.deviceId ?? params.sampleId ?? params.projectId ?? params.resourceId;

		// If location includes an ID increase frequency count
		if (repositoryId && id) {
			const obj = this.frequencyMap.get(id) ?? {
				count: 0,
				repositoryId: repositoryId,
			};
			this.frequencyMap.set(id, { ...obj, count: obj.count + 1 });

			this.history.push({ repositoryId, id });
			this.save();
		}
	}

	save() {
		// Prune and save history
		const persistHistory = this.history.slice(
			Math.max(this.history.length - HistoryService.HISTORY_STORAGE_SIZE, 0)
		);
		localStorage.setItem(
			HistoryService.HISTORY_SERVICE_KEY + HistoryService.HISTORY_SERVICE_HISTORY,
			JSON.stringify(persistHistory)
		);

		localStorage.setItem(
			HistoryService.HISTORY_SERVICE_KEY + HistoryService.HISTORY_SERVICE_FAVORITES,
			JSON.stringify(this.favorites)
		);

		// Save frequency map
		localStorage.setItem(
			HistoryService.HISTORY_SERVICE_KEY + HistoryService.HISTORY_SERVICE_FREQUENCY,
			JSON.stringify([...this.frequencyMap])
		);
	}

	private getHistoryIds() {
		return this.history;
	}

	public getMostRecentlyIds(limit = 10) {
		// Must call reverse on a copy of the array to avoid modifying the original
		const mostRecently = uniqBy([...this.getHistoryIds()].reverse(), (r) => r.id);
		return HistoryService.limit(mostRecently, limit);
	}

	public getMostFrequentlyIds(limit = 10) {
		const mostFrequently = Array.from(this.frequencyMap.keys()).sort((a, b) => {
			const cntA = this.frequencyMap.get(a);
			const cntB = this.frequencyMap.get(b);
			assertDefined(cntA);
			assertDefined(cntB);
			return cntB.count - cntA.count;
		});

		return HistoryService.limit(
			mostFrequently.map((id) => {
				const repositoryId = this.frequencyMap.get(id);
				assertDefined(repositoryId);
				return {
					id,
					repositoryId: repositoryId.repositoryId,
				};
			}),
			limit
		);
	}

	public getFavorites() {
		return this.favorites;
	}

	public addToFavorites(id: string, repositoryId: string) {
		this.favorites.push({ id, repositoryId });
		this.save();
	}

	public removeFromFavorites(id: string, repositoryId: string) {
		const index = this.favorites.findIndex((f) => f.id === id && f.repositoryId === repositoryId);
		if (index !== -1) {
			this.favorites.splice(index, 1);
		}
		this.save();
	}

	private static limit(items: { id: string; repositoryId: string }[], limit: number) {
		// Limit result count to `limit`
		if (items.length < limit) {
			return items;
		}
		return items.slice(0, limit);
	}

	private static loadArrayFromStorage<T>(key: string) {
		const storedArray = localStorage.getItem(HistoryService.HISTORY_SERVICE_KEY + key);
		if (storedArray !== null) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const data = JSON.parse(storedArray);
			if (Array.isArray(data)) {
				return data as T[];
			}
		}
	}
}
