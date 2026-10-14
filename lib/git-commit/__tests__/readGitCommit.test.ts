import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readGitCommit } from "~/lib/git-commit/readGitCommit.ts";

describe("readGitCommit", () => {
	let directory: string;
	let hash: string;

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), "git-commit-"));
		git("init");
		writeFileSync(join(directory, "source.txt"), "original\n");
		writeFileSync(join(directory, ".gitignore"), "ignored.txt\n");
		git("add", ".");
		git(
			"-c",
			"user.name=Test Author",
			"-c",
			"user.email=test@example.com",
			"commit",
			"-m",
			"Initial commit",
		);
		hash = git("rev-parse", "HEAD").trim();
	});

	afterEach(() => {
		rmSync(directory, { recursive: true, force: true });
	});

	test("returns the full HEAD hash for a clean working tree", () => {
		const commit = readGitCommit(directory);

		expect(commit).toBe(hash);
		expect(commit).toMatch(/^[0-9a-f]{40}$/);
	});

	test("marks a changed tracked file as modified", () => {
		writeFileSync(join(directory, "source.txt"), "changed\n");

		const commit = readGitCommit(directory);

		expect(commit).toBe(`${hash} (modified)`);
	});

	test("marks an untracked file as modified", () => {
		writeFileSync(join(directory, "untracked.txt"), "new file\n");

		const commit = readGitCommit(directory);

		expect(commit).toBe(`${hash} (modified)`);
	});

	test("ignores files excluded by gitignore", () => {
		writeFileSync(join(directory, "ignored.txt"), "ignored file\n");

		const commit = readGitCommit(directory);

		expect(commit).toBe(hash);
	});

	test("returns unknown outside a Git repository", () => {
		rmSync(join(directory, ".git"), { recursive: true, force: true });

		const commit = readGitCommit(directory);

		expect(commit).toBe("unknown");
	});

	function git(...args: string[]): string {
		return execFileSync("git", args, {
			cwd: directory,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
	}
});
