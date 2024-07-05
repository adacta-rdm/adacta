import type { IResourceProps, ResourceManager } from "../../context/ResourceManager";

import type { IUserId } from "~/lib/database/Ids";

type Input = IResourceProps["attachment"];

/**
 * Filenames are generated based on the owning resource's id and the file hash. This regex is used
 * in incoming requests to ensure that filenames don't contain malicious characters, for example "/"
 * or "..", to avoid a directory traversal attack.
 */
const VALID_FILE_ID_REGEX = /^[a-z0-9\\-]+$/i;

/**
 * Takes an uploadId and turns it into a real resource.
 * User uploads are only stored with under their uploadId until they are explicitly turned into a
 * resource. Only at that point the upload becomes into something meaningful in the scope of Adacta
 */
export async function createResourceFromUpload(
	uploadId: string,
	name: string,
	input: Input,
	rm: ResourceManager,
	userId: IUserId
) {
	// Make sure resource ID contains only alphanumeric characters and "-"
	// RegExp#exec is faster than String#match and both work the same when not using the /g flag.
	// (https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/prefer-regexp-exec.md)
	if (!VALID_FILE_ID_REGEX.exec(uploadId)) {
		throw new Error("Supplied file id is invalid");
	}

	const resource = (
		await rm.create(
			{
				name,
				attachment: input,
				isRootResource: true,
			},
			{ type: "upload", uploadId },
			userId
		)
	)._unsafeUnwrap();

	return resource.id;
}
