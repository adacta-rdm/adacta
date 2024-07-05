import { parse } from "path";

import { isDir } from "@omegadot/fs";
import { readdir } from "@omegadot/fs";
import { writeFile } from "@omegadot/fs";

async function fun() {
	const enumStringFragments = [
		"/**",
		" * Generated file. Do not edit!",
		" **/",
		"export enum EDocId {",
	];
	const files = await readdir("apps/desktop-app/public/docs");
	for (const file of files) {
		if (await isDir(`apps/desktop-app/public/docs/${file}`)) {
			if (file !== "images") {
				console.warn("Found an unexpected directory in the docs directory.");
			}
			continue;
		}
		const { name, ext } = parse(file);
		if (ext.toLowerCase() === ".md" && ext.toLowerCase() !== ext) {
			console.warn(`Pleas use lower case letters for the .md extension for file ${name}`);
			continue;
		}
		if (ext !== ".md") {
			console.warn(
				`File ${name} has unsupported extension "${ext}". Only markdown files are supported (.md).`
			);
			continue;
		}

		const idInUppercase = name.toUpperCase();

		console.log(`Adding ${idInUppercase} to enum`);
		enumStringFragments.push(`\t${idInUppercase} = "${idInUppercase}",`);
	}
	enumStringFragments.push("}\n");
	const enumString = enumStringFragments.join("\n");
	await writeFile("apps/desktop-app/src/interfaces/EDocId.ts", enumString);
}

fun().catch((e) => {
	throw e;
});
