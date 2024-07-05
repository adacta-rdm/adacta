import { BUILD_DATE, COMMIT_SHA } from "./buildTimeConstants";
import type { IVersionResponse } from "./interface/IVersionResponse";

/**
 * To use this function, you must configure the build system to inject the constants declared above.
 * For esbuild, add entries to the `define` config section, for example:
 *    const GlobalOptions: BuildOptions = {
 *      ...
 *      define: {
 *        COMMIT_SHA: JSON.stringify(execSync("git rev-parse --short HEAD").trim()),
 *        BUILD_DATE: JSON.stringify(new Date().toISOString()),
 *      }
 *    };
 */
export function createVersionResponse(): IVersionResponse {
	return {
		commit: COMMIT_SHA,
		date: BUILD_DATE,
	};
}
