import { FormDataParseError, parseFormData } from "@remix-run/form-data-parser";
import { useEffect, type SubmitEvent } from "react";
import {
	data,
	redirect,
	useLocation,
	useNavigation,
	useOutletContext,
	useSubmit,
} from "react-router";

import { services } from "~/app/.server/context.ts";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import { UploadForm } from "~/app/components/UploadForm.tsx";
import type { AppContext } from "~/app/routes/_app.tsx";
import { Security } from "~/app/services/Security.ts";
import { UploadManager } from "~/app/services/UploadManager.ts";
import { Heading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";

import type { Route } from "./+types/files.import.ts";

export const handle = { breadcrumb: "Import files" } satisfies BreadcrumbHandle;

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export function meta() {
	return [{ title: "Import files — Adacta" }];
}

/**
 * Stores every file submitted by the upload form.
 *
 * The request body is a multipart stream. Each file is written to storage as
 * that stream is read. The upload is recorded after every file has been stored.
 */
export async function action({ request, context }: Route.ActionArgs) {
	let pending: ReturnType<UploadManager["beginUpload"]> | undefined;
	let formData: FormData;

	try {
		formData = await parseFormData(
			request,
			{
				// By default, the parser rejects a file larger than 2 MiB. Uploaded
				// files are written directly to storage and may be much larger. No
				// byte limit is therefore set here.
				maxFileSize: Number.POSITIVE_INFINITY,
			},
			async (upload) => {
				if (upload.fieldName !== "files") return;

				pending ??= context.get(services).get(UploadManager).beginUpload();

				const fileId = await pending.add({
					originalName: upload.name,
					mediaType: upload.type,
					source: upload.stream(),
				});

				// Form data holds only text and files. The handler therefore returns
				// the ID as text.
				return String(fileId);
			},
		);
	} catch (error) {
		if (error instanceof FormDataParseError) {
			return data({ error: "The upload form could not be read." }, { status: 400 });
		}

		throw error;
	}

	const storedCount = formData.getAll("files").length;

	if (storedCount === 0) {
		return data({ error: "Select at least one file." }, { status: 400 });
	}

	const uploadId = await pending!.commit(context.get(services).get(Security).userId);

	return redirect(`/files/${uploadId}`, 303);
}

export default function FilesImport({ actionData }: Route.ComponentProps) {
	const location = useLocation();
	const navigation = useNavigation();
	const submit = useSubmit();
	const { selectedFiles, addSelectedFiles, removeSelectedFile, clearSelectedFiles } =
		useOutletContext<AppContext>();

	useEffect(() => {
		const completedUpload =
			navigation.state === "loading" &&
			navigation.formAction === location.pathname &&
			navigation.formData?.has("files") === true &&
			navigation.location.pathname !== location.pathname;

		if (completedUpload) clearSelectedFiles();
	}, [clearSelectedFiles, location.pathname, navigation]);

	function uploadFiles(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (selectedFiles.length === 0) return;

		const formData = new FormData();

		for (const file of selectedFiles) {
			formData.append("files", file);
			formData.append("lastModified", String(file.lastModified));
		}

		void submit(formData, { method: "post", encType: "multipart/form-data" });
	}

	const isUploading = navigation.state !== "idle" && navigation.formData?.has("files") === true;
	const uploadError = actionData && "error" in actionData ? actionData.error : undefined;

	return (
		<>
			<Heading>Import files</Heading>
			<Text className="mt-2">
				Add the original files for this upload. A raw text preview is generated in the browser.
			</Text>

			<UploadForm
				files={selectedFiles}
				isUploading={isUploading}
				uploadError={uploadError}
				onAddFiles={addSelectedFiles}
				onRemoveFile={removeSelectedFile}
				onClear={clearSelectedFiles}
				onSubmit={uploadFiles}
			/>
		</>
	);
}
