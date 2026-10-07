import { FormDataParseError, parseFormData } from "@remix-run/form-data-parser";
import { and, eq, isNull } from "drizzle-orm";
import { useEffect, type SubmitEvent } from "react";
import {
	data,
	redirect,
	useLocation,
	useNavigation,
	useOutletContext,
	useSearchParams,
	useSubmit,
} from "react-router";

import { services } from "~/app/.server/context.ts";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import { UploadForm } from "~/app/components/UploadForm.tsx";
import type { AppContext, DropContext } from "~/app/routes/_app.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { UploadManager } from "~/app/services/UploadManager.ts";
import { Heading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { PIDNode } from "~/drizzle/schema/PIDNode.ts";

import type { Route } from "./+types/files.import.ts";

export const handle = { breadcrumb: "Import files" } satisfies BreadcrumbHandle;

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export function meta() {
	return [{ title: "Import files — Adacta" }];
}

export async function loader({ context, request }: Route.LoaderArgs) {
	const search = new URL(request.url).searchParams;
	if (search.get("contextKind") !== "inventory-entry") return { suggestion: null };
	const slug = search.get("contextSlug");
	if (!slug) return { suggestion: null };
	const db = context.get(services).get(ApplicationDatabase);
	const rig = await db
		.select({ id: InventoryEntry.id, slug: InventoryEntry.slug, name: InventoryEntry.name })
		.from(InventoryEntry)
		.where(
			and(
				eq(InventoryEntry.slug, slug),
				eq(InventoryEntry.kind, "rig"),
				isNull(InventoryEntry.metadataArchivedAt),
			),
		)
		.get();
	if (!rig) return { suggestion: null };
	const symbols = await db
		.select({ key: PIDNode.symbolKey })
		.from(PIDNode)
		.where(and(eq(PIDNode.inventoryEntryId, rig.id), isNull(PIDNode.metadataArchivedAt)))
		.all();
	return {
		suggestion: {
			...rig,
			symbolKeys: symbols.flatMap((node) => (node.key ? [node.key] : [])),
		},
	};
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
	const contextKind = formData.get("contextKind");
	const contextSlug = formData.get("contextSlug");
	const contextLabel = formData.get("contextLabel");
	const query = new URLSearchParams();
	if (
		(contextKind === "inventory-entry" || contextKind === "sample-batch") &&
		typeof contextSlug === "string" &&
		typeof contextLabel === "string"
	) {
		query.set("contextKind", contextKind);
		query.set("contextSlug", contextSlug);
		query.set("contextLabel", contextLabel);
	}
	const uploadedFiles = await context.get(services).get(UploadManager).filesOfUpload(uploadId);
	const csvFiles = uploadedFiles.filter((file) => /\.csv$/i.test(file.originalName));
	const tomlFiles = uploadedFiles.filter((file) => /\.toml$/i.test(file.originalName));
	const hasSidecarBundle =
		uploadedFiles.length === 2 && csvFiles.length === 1 && tomlFiles.length === 1;
	const destination = hasSidecarBundle
		? `/files/${uploadId}/measurements/import`
		: `/files/${uploadId}`;
	return redirect(`${destination}${query.size ? `?${query}` : ""}`, 303);
}

export default function FilesImport({ actionData, loaderData }: Route.ComponentProps) {
	const location = useLocation();
	const navigation = useNavigation();
	const submit = useSubmit();
	const { dropContext, selectedFiles, addSelectedFiles, removeSelectedFile, clearSelectedFiles } =
		useOutletContext<AppContext>();
	const [searchParams] = useSearchParams();
	const context = dropContext ?? readDropContext(searchParams);

	useEffect(() => {
		const completedUpload =
			navigation.state === "loading" &&
			navigation.formAction?.split("?")[0] === location.pathname &&
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
		if (context) {
			formData.append("contextKind", context.kind);
			formData.append("contextSlug", context.slug);
			formData.append("contextLabel", context.label);
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
			{context ? (
				<div className="mt-4 rounded-lg border border-border bg-surface-muted p-4">
					<p className="text-sm font-semibold text-foreground">Starting context</p>
					<p className="mt-1 text-sm text-foreground-muted">
						{context.kind === "inventory-entry" ? "Inventory item" : "Sample batch"}:{" "}
						{context.label}
					</p>
				</div>
			) : null}

			<UploadForm
				action={`${location.pathname}${location.search}`}
				files={selectedFiles}
				suggestion={loaderData.suggestion ?? undefined}
				measurementMode={selectedFiles.some((file) => /\.(csv|toml)$/i.test(file.name))}
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

function readDropContext(params: URLSearchParams): DropContext | undefined {
	const kind = params.get("contextKind");
	const slug = params.get("contextSlug");
	const label = params.get("contextLabel");
	if (!slug || !label) return undefined;
	if (kind === "inventory-entry" || kind === "sample-batch") return { kind, slug, label };
	return undefined;
}
