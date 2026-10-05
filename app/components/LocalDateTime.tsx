import { useSyncExternalStore } from "react";

/**
 * A moment formatted in the reader's time zone after the page has loaded.
 *
 * The server uses UTC. The first browser render uses the same text, so
 * hydration does not change the existing markup before React takes control.
 */
export function LocalDateTime({ value }: { value: Date }) {
	const hasHydrated = useHasHydrated();
	const text = hasHydrated
		? LOCAL_DATE_TIME_FORMAT.format(value)
		: `${UTC_DATE_TIME_FORMAT.format(value)} UTC`;

	return <time dateTime={value.toISOString()}>{text}</time>;
}

/**
 * Whether React has completed the server-rendered page in the browser.
 */
export function useHasHydrated(): boolean {
	return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}

function subscribe(): () => void {
	return () => undefined;
}

function clientSnapshot(): boolean {
	return true;
}

function serverSnapshot(): boolean {
	return false;
}

const LOCAL_DATE_TIME_FORMAT = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeStyle: "short",
});

const UTC_DATE_TIME_FORMAT = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});
