import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { writeOutput } from "~/lib/tsrc/src/writeOutput";

test("keeps manual and unchanged files and removes stale generated files", async () => {
	const outputDirectory = await mkdtemp(join(tmpdir(), "tsrc-output-"));

	try {
		await mkdir(join(outputDirectory, "stale"));
		await Bun.write(join(outputDirectory, "stale/generated.js"), "// @generated\nold\n");
		await Bun.write(join(outputDirectory, "stale/manual.js"), "manual\n");
		await Bun.write(join(outputDirectory, "manual.js"), "manual\n");

		const files = [
			{ relativePath: "current.js", contents: "export const current = true;\n" },
			{ relativePath: "manual.js", contents: "generated replacement\n" },
		];

		await writeOutput(outputDirectory, files);
		const firstModified = (await stat(join(outputDirectory, "current.js"))).mtimeMs;
		const report = await writeOutput(outputDirectory, files);

		expect((await stat(join(outputDirectory, "current.js"))).mtimeMs).toBe(firstModified);
		expect(await Bun.file(join(outputDirectory, "manual.js")).text()).toBe("manual\n");
		expect(await Bun.file(join(outputDirectory, "stale/generated.js")).exists()).toBe(false);
		expect(await Bun.file(join(outputDirectory, "stale/manual.js")).text()).toBe("manual\n");
		expect(report.entries).not.toContain("written: current.js");
	} finally {
		await rm(outputDirectory, { recursive: true, force: true });
	}
});
