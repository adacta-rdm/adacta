import { relative, resolve } from "path";

import { mkdirp, stat, writeFile } from "@omegadot/fs";
import program from "commander";
import type { Config } from "ts-json-schema-generator";
import { BaseError, formatError } from "ts-json-schema-generator";
import { createGenerator } from "ts-json-schema-generator/dist/factory/generator";
import { VError } from "verror";

program
	.name("ts-runtime-checks")
	// .description('')
	// .version('1')
	.requiredOption("-d, --dir <string>", "Path to directory where types are located")
	.requiredOption(
		"-o, --outDir <string>",
		"Path to directory where generated files should be written"
	)
	.parse(process.argv);

if (program.args.length === 0) throw new Error("Must specify at least one type");

// Generate files for all types per default
const files: string[] = program.args //(program.args.length > 0 ? program.args : ['*'])
	// Convert type names to file names
	.map((file) => (file.endsWith(".ts") ? file : `${file}.ts`));

// The directory where the types are located (absolute path)
const typesDir = resolve(process.cwd(), program.dir as string);

// The directory where the generated files will be written to (absolute path)
const outDir = resolve(process.cwd(), program.outDir as string);

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
	// Get directory entries and include only those with a .ts extension
	const typeList =
		// (await readdir(typesDir))
		// .filter(file => file.endsWith('.ts'))
		files.map((file) => {
			// Per convention, each file contains a type/interface of the same name.
			// The list of types for which runtime checks should be generated can thus be inferred from the list of
			// files without the file extension.
			const typeName = file.slice(0, -3);

			const path = resolve(typesDir, file);

			process.stdout.write(`Processing type "${typeName}"`);

			const config: Config = {
				path,
				tsconfig: "./tsconfig.json",
				type: typeName,
				expose: "export",
				jsDoc: "none",
				topRef: true,
				skipTypeCheck: true, // Faster
			};

			try {
				return {
					// Absolute path to the ts file
					path,
					// Path to the ts file containing the type relative to the generated file
					relativePath: relative(outDir, resolve(typesDir, typeName)),
					// Per convention, each file contains a type/interface of the same name.
					// The list of types for which runtime checks should be generated can thus be inferred from the list of
					// files without the file extension.
					name: typeName,
					schema: JSON.stringify(createGenerator(config).createSchema(typeName), null, 2),
				};
			} catch (error) {
				if (error instanceof BaseError) {
					process.stderr.write(formatError(error));
					process.exit(1);
				} else {
					throw error;
				}
			}
		});

	// Create output directory structure
	try {
		await mkdirp([outDir, "schema"]);
	} catch (e) {
		throw new VError(e as Error, `Could not create output dir`);
	}

	await Promise.all([
		// Generate JSON schemas
		...typeList.map((type) =>
			writeFile([outDir, "schema", `${type.name}.schema.json`], type.schema)
		),
		// Generate assert functions
		...typeList.map((type) => writeFile([outDir, `assert${type.name}.ts`], assert(type))),
		// Generate cast functions
		...typeList.map((type) => writeFile([outDir, `cast${type.name}.ts`], cast(type))),
		// Generate is functions
		...typeList.map((type) => writeFile([outDir, `is${type.name}.ts`], is(type))),

		// Generate validate functions.
		// Only generated if they do not already exist.
		...typeList.map(async (type) => {
			const outPath = resolve(outDir, `validate${type.name}.ts`);

			try {
				const fileStats = await stat(outPath);
				if (fileStats.isDirectory()) {
					return await Promise.reject(new Error(`"${outPath}" is a directory`));
				}
				return;
			} catch (e: any) {
				// Proceed with file generation if a file does not exist error is encountered.
				// Rethrow all other errors.
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
				if (typeof e.code !== "string" || e.code.indexOf("ENOENT") === -1) {
					throw e;
				}
			}

			return writeFile(outPath, validate(type));
		}),
	]);
})();

interface IType {
	name: string;
	relativePath: string;
}

function assert(type: IType) {
	return `/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { ${type.name} } from "${type.relativePath}";
import { validate${type.name} } from "./validate${type.name}";

export function assert${type.name}(arg: any): asserts arg is ${type.name} {
	const errors = validate${type.name}(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type ${type.name}: " + errors[0].message);
}
`;
}

function cast(type: IType) {
	return `/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { ${type.name} } from "${type.relativePath}";
import { assert${type.name} } from "./assert${type.name}";

export function cast${type.name}(arg: any): ${type.name} {
	assert${type.name}(arg);
	return arg;
}
`;
}

function is(type: IType) {
	return `/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { ${type.name} } from "${type.relativePath}";
import { validate${type.name} } from "./validate${type.name}";

export function is${type.name}(arg: any): arg is ${type.name} {
	return validate${type.name}(arg).length == 0;
}
`;
}

function validate(type: IType) {
	return `/**
 * Generated stub. Edit this file if needed.
 */
import { createValidationFunction } from "@omegadot/tsrc-helpers";
import schema from "./schema/${type.name}.schema.json";

export const validate${type.name} = createValidationFunction(schema);
`;
}
