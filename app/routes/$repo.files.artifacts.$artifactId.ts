import { services } from "~/app/.server/context";
import { SourceFileNotFoundError, SourceManager } from "~/app/services/SourceManager";
import { FileNotFoundError } from "~/lib/storage-engine/FileNotFoundError";

import type { Route } from "./+types/$repo.files.artifacts.$artifactId";

/**
 * Downloads one original file.
 */
export async function loader({ context, params }: Route.LoaderArgs) {
	try {
		const artifact = context.get(services).get(SourceManager).getArtifact(params.artifactId);

		return new Response(await artifact.read(), {
			headers: {
				"Content-Disposition": contentDisposition(artifact.originalName),
				"Content-Length": String(artifact.byteSize),
				"Content-Type": artifact.mediaType ?? "application/octet-stream",
			},
		});
	} catch (error) {
		if (error instanceof SourceFileNotFoundError || error instanceof FileNotFoundError) {
			throw new Response("Source file not found.", { status: 404 });
		}
		throw error;
	}
}

function contentDisposition(fileName: string): string {
	const encoded = encodeURIComponent(fileName).replace(
		/[!'()*]/g,
		(character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
	);
	return `attachment; filename*=UTF-8''${encoded}`;
}
