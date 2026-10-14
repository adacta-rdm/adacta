import { execFileSync } from "node:child_process";

/**
 * Returns the full hash of HEAD for the given working directory. Tracked or
 * untracked changes add " (modified)". Ignored files do not add the suffix.
 * Returns "unknown" when Git or the repository is unavailable.
 */
export function readGitCommit(directory: string): string {
	try {
		const commit = execFileSync("git", ["rev-parse", "HEAD"], {
			cwd: directory,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		}).trim();

		// Porcelain status includes untracked files and leaves ignored files out.
		const changes = execFileSync("git", ["status", "--porcelain"], {
			cwd: directory,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});

		return changes.length > 0 ? `${commit} (modified)` : commit;
	} catch {
		// Source archives and container builds may have neither Git nor .git.
		return "unknown";
	}
}
