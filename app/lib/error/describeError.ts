/**
 * The words shown on an error page.
 *
 * A Response thrown by a loader carries a sentence written for the reader, for
 * example 'Inventory entry "methanation" not found.'. React Router also
 * generates errors of its own, and their message names a route or a URL. Those
 * are replaced, because a reader cannot act on them.
 */
import { isRouteErrorResponse } from "react-router";

export type ErrorDescription = {
	/**
	 * The HTTP status, or undefined when the error is not a route error.
	 */
	status: number | undefined;
	title: string;
	message: string;
};

const FALLBACK_TITLE = "Something went wrong";
const FALLBACK_MESSAGE = "The page could not be loaded.";

const TITLES: Record<number, string> = {
	403: "No access",
	404: "Not found",
};

const MESSAGES: Record<number, string> = {
	403: "You do not have permission to open this page.",
	404: "The page you asked for does not exist.",
};

export function describeError(error: unknown): ErrorDescription {
	if (!isRouteErrorResponse(error)) {
		return { status: undefined, title: FALLBACK_TITLE, message: FALLBACK_MESSAGE };
	}

	// React Router sets a status text on every error it generates. A Response
	// thrown by a loader leaves it empty, because that is the default. An empty
	// status text therefore marks a message this application wrote.
	const isOurMessage =
		error.statusText === "" && typeof error.data === "string" && error.data !== "";

	return {
		status: error.status,
		title: TITLES[error.status] ?? FALLBACK_TITLE,
		message: isOurMessage ? error.data : (MESSAGES[error.status] ?? FALLBACK_MESSAGE),
	};
}
