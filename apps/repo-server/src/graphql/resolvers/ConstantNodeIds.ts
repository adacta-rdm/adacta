import type { INodeResolvers } from "../generated/resolvers";

export const CONSTANT_NODE_IDS: {
	[key: string]: { type: ReturnType<INodeResolvers["__resolveType"]>; id: string };
} = {
	/**
	 * There can be only one "current user", we hence use a constant id.
	 */
	CURRENT_USER_ID: { type: "CurrentUser", id: "CURRENT_USER_ID" },
	SEARCH_RESULT_ID: { type: "SearchResults", id: "SEARCH_RESULT_ID" },
	MONITORED_JOBS_STATUS_ID: { type: "MonitoredJobsStatus", id: "MONITORED_JOBS_STATUS_ID" },
	LATEST_NOTIFICATION_ID: { type: "LatestNotification", id: "LATEST_NOTIFICATION_ID" },
};
