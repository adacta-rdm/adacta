import { getAppId } from "./getAppId";
import { sh } from "../sh";

/**
 * Deploys the app with given `appName`.
 *
 * Deploying means that Digitalocean will fetch the most recent sources specified in the app-spec file and
 */
export async function createDeployment(appName: string): Promise<void> {
	const appId: string = await getAppId(appName);

	await sh(`doctl apps create-deployment ${appId}`);
}
