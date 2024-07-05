import type http from "http";

import type { HeaderType } from "./readHeaderAsStringOrUndefined";
import { readHeaderAsStringOrUndefined } from "./readHeaderAsStringOrUndefined";

import type { IUserId } from "~/lib/database/Ids";
import { extractJWTFromHTTPHeader } from "~/lib/utils/extractJWTFromHTTPHeader";

export class AuthenticatedUserInfo {
	public static createFromHTTPHeaders(
		headers: Readonly<Record<string, unknown> | undefined> | http.IncomingHttpHeaders
	): AuthenticatedUserInfo {
		if (!headers) {
			throw new Error("Did not find headers");
		}

		// This should always work since the GraphQL endpoint is already protected
		const token = readAsString(headers["authorization"] as HeaderType, "authorization");
		const userInfo = extractJWTFromHTTPHeader(token);

		return new AuthenticatedUserInfo(userInfo.userId, token);
	}

	constructor(public userId: IUserId, public token: string) {}
}

function readAsString(s: HeaderType, displayName?: string) {
	s = readHeaderAsStringOrUndefined(s);
	if (!s) {
		throw new Error(`Header${displayName ? ` (${displayName})` : ""} is undefined`);
	}

	return s;
}
