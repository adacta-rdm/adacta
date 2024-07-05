import type { JsonValue } from "type-fest";

import { getAppId } from "./getAppId";
import { sh } from "../sh";

/**
 * Returns the app spec for the given `appName` and `deploymentId` as a JSON string. When `deploymentId` is not
 * specified, the function will return the most recent non-empty app spec, where an empty spec is defined as an app with
 * no components. In case only empty app deployments exist, the oldest app spec is returned.
 */
export async function getAppSpec(appName: string, deploymentId?: string): Promise<string> {
	const appId = await getAppId(appName);

	if (deploymentId) {
		return sh(`doctl apps spec get ${appId} --deployment ${deploymentId} --format json`);
	}

	const deploymentIds = (await sh(`doctl apps list-deployments ${appId} --format ID`)).split("\n");

	let spec;
	for (const deploymentId of deploymentIds) {
		if (deploymentId === "ID") continue;

		spec = await getAppSpec(appName, deploymentId);
		if (!isEmpty(JSON.parse(spec))) return spec;
	}

	if (!spec) throw new Error(`Could not find an app spec for app "${appName}".`);

	return spec;
}

function isEmpty(json: JsonValue) {
	if (!(typeof json === "object") || json === null) return true;
	if ("services" in json && Array.isArray(json.services)) return false;
	if ("functions" in json && Array.isArray(json.functions)) return false;
	if ("workers" in json && Array.isArray(json.workers)) return false;
	if ("jobs" in json && Array.isArray(json.jobs)) return false;
	return true;
}
