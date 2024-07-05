import { GENERATED_HEADER_GRAPHQL, GENERATED_HEADER_TS } from "./generatorConsts";

export function isGenerated(contents: string) {
	return contents.startsWith(GENERATED_HEADER_GRAPHQL) || contents.startsWith(GENERATED_HEADER_TS);
}
