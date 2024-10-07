import { resolve } from "node:path";

import { TSRC } from "~/scripts/tsrc/TSRC";

const projectDirectory = resolve(__dirname, "..");

async function main() {
	const tsrc = new TSRC(projectDirectory, "@/tsrc", [
		// "@",
		// Our database ids use Opaque types, which TSRC cannot generate useful type checks for.
		"lib/database/Ids.ts",
		"apps/repo-server/src/graphql/generated/requests.ts",
		"apps/repo-server/src/graphql/generated/resolvers.ts",
	]);

	tsrc.processSourceFiles();
	await tsrc.writeAmbientModuleDeclarations();
	await tsrc.writeRunTimeTypeChecks();

	for (const item of tsrc.reporter.entries) console.log(` - ${item}`);
}

void main();
