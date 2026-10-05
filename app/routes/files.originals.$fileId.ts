import { services } from "~/app/.server/context.ts";
import { OriginalFileNotFoundError, UploadManager } from "~/app/services/UploadManager.ts";
import { parseId53 } from "~/lib/id53/parseId53.ts";
import { FileNotFoundError } from "~/lib/storage-engine/FileNotFoundError.ts";

import type { Route } from "./+types/files.originals.$fileId.ts";

/**
 * Downloads one original file.
 */
export async function loader({ context, params }: Route.LoaderArgs) {
	const fileId = parseId53(params.fileId);

	// Text that is not an ID gets the same answer as an unknown ID.
	if (fileId === undefined) throw new Response("Original file not found.", { status: 404 });

	try {
		const file = await context.get(services).get(UploadManager).getFile(fileId);

		return new Response(await file.read(), {
			headers: {
				"Content-Disposition": contentDisposition(file.originalName),
				"Content-Length": String(file.byteSize),
				"Content-Type": file.mediaType ?? "application/octet-stream",
			},
		});
	} catch (error) {
		if (error instanceof OriginalFileNotFoundError || error instanceof FileNotFoundError) {
			throw new Response("Original file not found.", { status: 404 });
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
