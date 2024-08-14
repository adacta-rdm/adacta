import { readFileSync } from "node:fs";
import { dirname, join } from "path";

import { describe, test, expect, afterEach } from "vitest";
import { vi as jest } from "vitest";

import { graphQLBuilderCLI } from "../graphQLBuilderCLI";

import { mkdirp, mkdirTmp, readdir, readUTF8File, rmrf, writeFile } from "~/lib/fs";

const MyType2 = readFileSync(join(__dirname, "./typeDefs/MyType2.graphql"), "utf-8");
const queries = readFileSync(join(__dirname, "./typeDefs/queries.graphql"), "utf-8");
const schema = readFileSync(join(__dirname, "./typeDefs/schema.graphql"), "utf-8");
const schema1 = readFileSync(join(__dirname, "./typeDefs/schema1.graphql"), "utf-8");
const types = readFileSync(join(__dirname, "./typeDefs/types.graphql"), "utf-8");

describe("graphQLBuilderCLI()", () => {
	async function setup() {
		const tmpDir = await mkdirTmp();

		await mkdirp([tmpDir, "graphql"]);

		await writeFile([tmpDir, "graphql/schema1.graphql"], schema1);
		await writeFile([tmpDir, "graphql/MyType2.graphql"], MyType2);
		await writeFile(
			//
			[tmpDir, ".graphqlconfig"],
			JSON.stringify({
				projects: {
					Test1: {
						includes: ["graphql/*.graphql"],
					},
				},
			})
		);

		return {
			tmpDir,
			include: join(tmpDir, "graphql/*.graphql"),
			outdir: join(tmpDir, "generated"),
		};
	}

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test("single file build", async () => {
		const { include, tmpDir } = await setup();

		const outfile = join(tmpDir, "schema.graphql");

		await graphQLBuilderCLI({ include, build: outfile });

		const generated = await readUTF8File(outfile);

		expect(generated).toContain("type Result_Type1");
		expect(generated).toContain("type Result_Type2");
		expect(generated).toContain("type Result_T");
		expect(generated).toContain("scalar T");
	});

	test("single file build - project option", async () => {
		const { tmpDir } = await setup();

		jest.spyOn(process, "cwd").mockImplementation(() => tmpDir);

		const outfile = join(tmpDir, "schema.graphql");

		await graphQLBuilderCLI({ project: "Test1", build: outfile });

		const generated = await readUTF8File(outfile);

		expect(generated).toContain("type Result_Type1");
		expect(generated).toContain("type Result_Type2");
		expect(generated).toContain("type Result_T");
		expect(generated).toContain("scalar T");
	});

	test("bundle", async () => {
		// Similar to a single file build, but the output file includes only the types that are actually used by the
		// entrypoint type.
		const { include, tmpDir } = await setup();
		await writeFile([tmpDir, "graphql/schema.graphql"], schema);
		const outfile = join(tmpDir, "schema-bundle.graphql");

		await graphQLBuilderCLI({ include, bundle: outfile });

		const generated = await readUTF8File(outfile);

		expect(generated).toContain("schema");
		expect(generated).toContain("type Query");
		expect(generated).toContain("type MyType");
		expect(generated).toContain("type Result_Type1");
		expect(generated).not.toContain("interface Result_T");
	});

	test("multiple file build", async () => {
		const { include, outdir } = await setup();

		await graphQLBuilderCLI({ include, buildDir: outdir });

		const list = await readdir(outdir);

		expect(list).toEqual(["Result_Type1.graphql", "Result_Type2.graphql", "T.graphql"]);
	});

	test("build - deletes generated files that are obsolete", async () => {
		// Generate the files once, then delete the MyType2.graphql file. Because that type is the only one that uses
		// Result_Type2, the file Result_Type2.graphql should be deleted as well.
		const { tmpDir, include, outdir } = await setup();

		await graphQLBuilderCLI({ include, buildDir: outdir });

		expect(await readdir(outdir)).toContain("Result_Type2.graphql");

		await rmrf([tmpDir, "graphql/MyType2.graphql"]);

		await graphQLBuilderCLI({ include, buildDir: outdir });
		expect(await readdir(outdir)).not.toContain("Result_Type2.graphql");
	});

	test("build - deletes generated files that are obsolete when writing to include dir", async () => {
		// Generate the files once, then delete the MyType2.graphql file. Because that type is the only one that uses
		// Result_Type2, the file Result_Type2.graphql should be deleted as well.
		const { tmpDir, include } = await setup();

		const outdir = dirname(include);

		await graphQLBuilderCLI({ include, buildDir: outdir });

		expect(await readdir(outdir)).toContain("Result_Type2.graphql");

		await rmrf([tmpDir, "graphql/MyType2.graphql"]);

		await graphQLBuilderCLI({ include, buildDir: outdir });
		expect(await readdir(outdir)).not.toContain("Result_Type2.graphql");
	});

	test("multiple file build - overwrites only generated files", async () => {
		// Generate the files once, then modify two of them, keeping the @generated comment only in one of them.
		// Run the script again and verify that only the one with the comment is overwritten.
		const { include, outdir } = await setup();

		await graphQLBuilderCLI({ include, buildDir: outdir });

		const fileContents1 = `type Result_Type1 { id: ID! }\n# This file was modified.`;
		const fileContents2 = `# @generated\n\ntype Result_Type2 { id: ID! }\n# This file was modified.`;
		await writeFile([outdir, "Result_Type1.graphql"], fileContents1);
		await writeFile([outdir, "Result_Type2.graphql"], fileContents2);

		await graphQLBuilderCLI({ include, buildDir: outdir });

		expect(await readUTF8File([outdir, "Result_Type1.graphql"])).toBe(fileContents1);
		// expect(await readUTF8File([outdir, "Result_Type2.graphql"])).not.toBe(fileContents2);
	});

	test("typescript type generation - resolver types", async () => {
		const { tmpDir, include, outdir } = await setup();
		// This file contains a schema definition needed for the bundle option.
		await writeFile([tmpDir, "graphql/schema.graphql"], schema);

		const outFileTsResolvers = join(outdir, "types.ts");

		await graphQLBuilderCLI({ include, tsSchema: outFileTsResolvers });

		const list = await readdir(outdir);

		expect(list).toEqual(["types.ts"]);
		expect(await readUTF8File(outFileTsResolvers)).toMatchSnapshot();
	});

	test("typescript type generation - requests code", async () => {
		const tmpDir = await mkdirTmp();
		// This file contains a schema definition needed for the bundle option.
		// await writeFile([tmpDir, "graphql/schema.graphql"], schema);
		await writeFile([tmpDir, "queries.graphql"], queries);
		await writeFile([tmpDir, "types.graphql"], types);

		const outFileTsRequests = join(tmpDir, "requests.ts");

		await graphQLBuilderCLI({ include: join(tmpDir, "*.graphql"), tsRequests: outFileTsRequests });

		const list = await readdir(tmpDir);

		expect(list).toContain("requests.ts");
		expect(await readUTF8File(outFileTsRequests)).toMatchSnapshot();
	});
});
