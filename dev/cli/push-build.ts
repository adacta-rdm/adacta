import { shSync as sh } from "../sh";

const args = process.argv.slice(2);

if (args.length < 1) {
	process.stderr.write(
		`Usage ${process.argv[1]} [--deploy-staging] [--origin GIT-ORIGIN] [...paths]`
	);
	process.exit(1);
}

const commitPaths = [];
let deployStaging = false;
let origin = "origin";

for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if (arg === "-ds" || arg === "--deploy-staging") {
		deployStaging = true;
		continue;
	}

	if (arg === "-o" || arg === "--origin") {
		origin = args[i + 1];
		i++;
		continue;
	}

	commitPaths.push(arg);
}

// The name of the current branch
const branch = sh("git branch --show-current");

// Abort if we are in a build branch
if (branch.startsWith("build/")) {
	process.stderr.write("Cannot continue from a checked out build branch");
	process.exit(1);
}

const buildBranch = !deployStaging ? `build/${branch}` : `build/staging`;

try {
	// Unstage everything so only the built files are added to the commit
	sh("git reset HEAD");

	// Repoint the build branch to the current commit and checkout that branch
	sh(`git branch --force ${buildBranch}`);
	sh(`git checkout ${buildBranch}`);

	// Add the built files even though they are in the .gitignore
	sh(`git add -f ${commitPaths.join(" ")}`);

	const commit = sh("git rev-parse --short HEAD").trim();
	sh(`git commit -m "$(date +%F) build ${commit}"`);

	sh(`git push -f ${origin} ${buildBranch}`);

	if (deployStaging) {
		// eslint-disable-next-line no-console
		console.log(`Commit ${commit} deployed to staging`);
	}
} finally {
	// Checkout the original branch again
	sh(`git checkout ${branch}`);
}
