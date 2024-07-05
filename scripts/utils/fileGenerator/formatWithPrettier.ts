import { normalizePath } from "@omegadot/fs";
import * as prettier from "prettier";

export async function formatWithPrettier(filePath: string | string[], fileContents: string) {
	// Prettify outputs
	const fullPath = normalizePath(filePath);
	const config = await prettier.resolveConfig(fullPath);

	return prettier.format(fileContents, {
		...config,
		filepath: fullPath, // Pass the file path to enable prettier to select the correct parser
	});
}
