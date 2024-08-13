export interface IRefreshableTimeout {
	refresh(): void;
	clear(): void;
}

export function setRefreshableTimeout(callback: () => void, ms: number): IRefreshableTimeout {
	let timeout = setTimeout(callback, ms);

	return {
		refresh() {
			clearTimeout(timeout);
			timeout = setTimeout(callback, ms);
		},
		clear() {
			clearTimeout(timeout);
		},
	};
}
