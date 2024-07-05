import { createDeployment } from "../doctl/createDeployment";

const args = process.argv.slice(2);

if (args.length !== 1) {
	process.stderr.write(`Usage ${process.argv[1]} [app-name]`);
	process.exit(1);
}

const [appName] = args;

void (async function main() {
	await createDeployment(appName);
})();
