import type { KnipConfig } from "knip";

const config: KnipConfig = {
	entry: [
		"./apps/repo-server/src/main.ts", // Repo-Server
		"./apps/desktop-app/src/index.tsx", // Web-App
		"./apps/repo-server/src/digitalocean/downsample.ts", // Downsampling Microservice
		"scripts/**/*.ts",
		"dev/**/*.ts",
		"drizzle/migrations/*.ts", // Treat migrations as entry points as they are dynamically imported
		"apps/desktop-app/hendriksRouteGenerator.ts", // Strange location...
	],
	project: [
		"**/*.ts",
		"apps/desktop-app/src/**/*.tsx",
		"!apps/repo-server/src/graphql/generated/**/*.ts",

		// Skip typechecks
		"!lib/interface/type_checks/**/*.ts",
		"!apps/repo-server/interface/type_checks/**/*.ts",

		// TODO: Make this work
		"!./.storybook/**/*.ts",
	],
};

export default config;
