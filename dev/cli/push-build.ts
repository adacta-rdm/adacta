import { shSync as sh } from "../sh";

const args = process.argv.slice(2);

if (args.length < 1) {
	process.stderr.write(`Usage ${process.argv[1]} [...paths]`);
	process.exit(1);
}

// The name of the current branch
const branch = sh("git branch --show-current");

// Abort if we are in a build branch
if (branch.startsWith("build/")) {
	process.stderr.write("Cannot continue from a checked out build branch");
	process.exit(1);
}

const commitPaths = args;
// const appPath = join(__dirname, "../../apps", appName);
const buildBranch = `build/${branch}`;

try {
	// Unstage everything so only the built files are added to the commit
	sh("git reset HEAD");

	// Repoint the build branch to the current commit and checkout that branch
	sh(`git branch --force ${buildBranch}`);
	sh(`git checkout ${buildBranch}`);

	// Add the built files even though they are in the .gitignore
	sh(`git add -f ${commitPaths.join(" ")}`);

	sh(`git commit -m "$(date +%F) build $(git rev-parse --short HEAD)"`);

	sh(`git push -f origin ${buildBranch}`);
} finally {
	// Checkout the original branch again
	sh(`git checkout ${branch}`);
}
