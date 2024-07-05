import { shSync } from "../sh";

const args = process.argv.slice(2);

const usage = `Usage ${process.argv[1]} [(-r | --remotes)] [(-l | --local)] [-e <branch>]`;

if (args.length < 1) {
	process.stderr.write(`${usage}\n`);
	process.exit(1);
}

// Whether to delete remote branches
let remotes = false;
// Whether to delete local branches
let local = false;
// Branches to exclude from deletion. Always excludes "main".
const exclude: string[] = ["main"];

for (let i = 0; i < args.length; ++i) {
	const arg = args[i];
	if (arg === "-r" || arg === "--remotes") {
		remotes = true;
		continue;
	}

	if (arg === "-l" || arg === "--local") {
		local = true;
		continue;
	}

	if (arg === "-e") {
		const branch = args[++i];
		if (branch === undefined || branch.startsWith("-")) {
			process.stderr.write(`Argument -e requires naming a branch.`);
			process.exit(1);
		}
		exclude.push(branch);
		continue;
	}

	process.stderr.write(`Unrecognized argument "${arg}".`);
	process.stderr.write(usage);
	process.exit(1);
}

// The name of the current branch
const branches = sh("git branch --all").split("\n");
for (const branch of branches) {
	const parts = branch.split("/").map((part) => part.trim());

	// remotes/[remote]/build/[repo-server|auth-server]/[branch]
	// 0       1        2     3                         4
	if (parts[0] === "remotes") {
		const [, remote, build, appName, branch] = parts;

		// The regex is to prevent version tags from being deleted
		if (!remotes || build !== "build" || exclude.includes(branch) || /v\d\.\d\.\d/.test(branch)) {
			continue;
		}

		sh(`git push --delete ${remote} ${build}/${appName}/${branch}`);
	}

	// build/[repo-server|auth-server]/[branch]
	else if (parts[0] === "build") {
		if (!local || exclude.includes(parts[2])) continue;
		sh(`git branch -D ${branch}`);
	}
}

function sh(command: string) {
	process.stdout.write(`${command}\n`);
	return shSync(command);
}
