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

import { services } from "~/app/.server/context";
import { SourceBundleForm } from "~/app/components/SourceBundleForm";
import type { RepositoryContext } from "~/app/routes/$repo";
import { Security } from "~/app/services/Security";
import { SourceManager } from "~/app/services/SourceManager";
import { Heading } from "~/catalyst-ui/heading";
import { Text } from "~/catalyst-ui/text";

import type { Route } from "./+types/$repo.files.import";

export function meta() {
	return [{ title: "Import files — Adacta" }];
}

/**
 * Stores all source files submitted as one multipart form.
 */
export async function action({ request, context, params }: Route.ActionArgs) {
	let bundleUpload: ReturnType<SourceManager["beginBundle"]> | undefined;
	let formData: FormData;

	try {
		formData = await parseFormData(
			request,
			{
				// The parser defaults to 2 MiB. Source files are streamed to storage
				// and may be larger. No byte limit is therefore applied here.
				maxFileSize: Number.POSITIVE_INFINITY,
			},
			async (upload) => {
				if (upload.fieldName !== "files") return;

				bundleUpload ??= context.get(services).get(SourceManager).beginBundle();
				return bundleUpload.add({
					originalName: upload.name,
					mediaType: upload.type,
					source: upload.stream(),
				});
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

	const bundleId = await bundleUpload!.commit(context.get(services).get(Security).userId);

	return redirect(`/${params.repo}/files/${bundleId}`, 303);
}

export default function RepoFilesImport({ actionData }: Route.ComponentProps) {
	const location = useLocation();
	const navigation = useNavigation();
	const submit = useSubmit();
	const { sourceBundle, addSourceFiles, removeSourceFile, clearSourceFiles } =
		useOutletContext<RepositoryContext>();

	useEffect(() => {
		const completedUpload =
			navigation.state === "loading" &&
			navigation.formAction === location.pathname &&
			navigation.formData?.has("files") === true &&
			navigation.location.pathname !== location.pathname;

		if (completedUpload) clearSourceFiles();
	}, [clearSourceFiles, location.pathname, navigation]);

	function uploadFiles(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (sourceBundle.length === 0) return;

		const formData = new FormData();

		for (const file of sourceBundle) {
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
				Add the original files that belong to this source bundle. A raw text preview is generated in
				the browser.
			</Text>

			<SourceBundleForm
				files={sourceBundle}
				isUploading={isUploading}
				uploadError={uploadError}
				onAddFiles={addSourceFiles}
				onRemoveFile={removeSourceFile}
				onClear={clearSourceFiles}
				onSubmit={uploadFiles}
			/>
		</>
	);
}
