import { execAsync } from "../sh";

/**
 * Returns the app spec for the given `appName` as a yaml string.
 */
export async function clearAppSpec(appName: string): Promise<void> {
	const emptyAppSpec = {
		name: appName,
		domains: [],
		envs: [],
		services: [],
	};

	const promise = execAsync(`doctl apps create ${appName} --upsert --spec -`);
	const { stdin } = promise.child;

	if (!stdin) throw new Error("doctl stdin unavailable.");

	stdin.write(JSON.stringify(emptyAppSpec));
	stdin.end();

	await promise;
}
