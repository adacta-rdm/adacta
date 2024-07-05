import { sh } from "../sh";

export async function getAppId(appName: string) {
	const lines = (await sh("doctl apps list")).split("\n");

	for (const line of lines) {
		// Split by at least 2 spaces
		const [id, name] = line.split(/ {2} */);
		if (name === appName) return id;
	}

	throw new Error(`Couldn't find app with name ${appName}`);
}
