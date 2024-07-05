require("node:fs").mkdirSync("@/relay", { recursive: true });

module.exports = {
	src: "apps/desktop-app/src",
	schema: "apps/repo-server/src/graphql/generated/schema.graphql",
	language: "typescript",
	customScalarTypes: {
		DateTime: "string",
		JSONString: "string",
		ColumnType: "unknown", // Simulate behaviour of relay compiler before v13
	},

	// Nullable union fields can also be undefined (from relay cache)
	// It might not be worth to use the improved types since it is possible that "undefined" will
	// get removed again.
	// https://github.com/facebook/relay/pull/4380#issuecomment-1830284852
	typescriptExcludeUndefinedFromNullableUnion: true,

	eagerEsModules: true,
	artifactDirectory: "@/relay",
};
