import type http from "http";

import type { HeaderType } from "./readHeaderAsStringOrUndefined";
import { readHeaderAsStringOrUndefined } from "./readHeaderAsStringOrUndefined";

export class RepositoryInfo {
	public static createFromHTTPHeaders(
		headers: Readonly<Record<string, unknown> | undefined> | http.IncomingHttpHeaders
	): RepositoryInfo | undefined {
		if (!headers) {
			throw new Error("Did not find headers");
		}

		const repoName = readHeaderAsStringOrUndefined(headers["repository-name"] as HeaderType);

		if (!repoName) return;

		return new RepositoryInfo(repoName);
	}

	constructor(public repositoryName: string) {}
}
