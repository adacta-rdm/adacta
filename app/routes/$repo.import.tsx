import { ArrowUpTrayIcon, DocumentTextIcon, XMarkIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router";

import { createFileProbe } from "~/app/import/FileProbe";
import { readTextPreview, type TextPreview } from "~/app/import/textPreview";
import type { RepositoryContext } from "~/app/routes/$repo";
import { Heading, Subheading } from "~/catalyst-ui/heading";
import { Text } from "~/catalyst-ui/text";

export function meta() {
	return [{ title: "Import — Adacta" }];
}

type PreviewState =
	| { file: File; status: "ready"; preview: TextPreview }
	| { file: File; status: "error" };

type ActivePreviewState = PreviewState | { status: "loading" };

export default function ImportRoute() {
	const inputRef = useRef<HTMLInputElement>(null);
	const { sourceBundle, addSourceFiles, removeSourceFile, clearSourceFiles } =
		useOutletContext<RepositoryContext>();
	const [selectedFile, setSelectedFile] = useState<File>();
	const activeFile =
		selectedFile && sourceBundle.includes(selectedFile) ? selectedFile : sourceBundle[0];
	const [previewState, setPreviewState] = useState<PreviewState>();
	const activePreviewState =
		previewState?.file === activeFile
			? previewState
			: activeFile
				? ({ status: "loading" } as const)
				: undefined;

	useEffect(() => {
		if (!activeFile) return;

		let cancelled = false;
		void readTextPreview(createFileProbe(activeFile)).then(
			(preview) => {
				if (!cancelled) setPreviewState({ file: activeFile, status: "ready", preview });
			},
			() => {
				if (!cancelled) setPreviewState({ file: activeFile, status: "error" });
			},
		);

		return () => {
			cancelled = true;
		};
	}, [activeFile]);

	function selectFiles(files: FileList | null) {
		const selectedFiles = files ? [...files] : [];
		if (selectedFiles.length > 0) addSourceFiles(selectedFiles);
		if (inputRef.current) inputRef.current.value = "";
	}

	return (
		<div className="space-y-8">
			<div>
				<Heading>Import</Heading>
				<Text className="mt-2">
					Add the original files that belong to this source bundle. A raw text preview is generated
					in the browser.
				</Text>
			</div>

			{sourceBundle.length === 0 ? (
				<EmptyBundle inputRef={inputRef} onSelect={selectFiles} />
			) : (
				<>
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<Subheading>Source bundle</Subheading>
							<p className="mt-1 text-sm text-foreground-muted">
								{sourceBundle.length} {sourceBundle.length === 1 ? "file" : "files"}
							</p>
						</div>
						<div className="flex items-center gap-3">
							<button
								type="button"
								className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
								onClick={clearSourceFiles}
							>
								Clear
							</button>
							<label className="cursor-pointer rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
								Add files
								<input
									ref={inputRef}
									type="file"
									multiple
									className="sr-only"
									onChange={(event) => selectFiles(event.currentTarget.files)}
								/>
							</label>
						</div>
					</div>

					<div className="grid gap-6 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
						<ul className="space-y-2" aria-label="Files in the source bundle">
							{sourceBundle.map((file) => {
								const selected = file === activeFile;
								return (
									<li
										key={fileIdentity(file)}
										className={clsx(
											"flex items-center gap-1 rounded-lg border p-1",
											selected ? "border-accent bg-surface-muted" : "border-border bg-surface",
										)}
									>
										<button
											type="button"
											className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-2 text-left focus-visible:outline-2 focus-visible:outline-focus"
											onClick={() => setSelectedFile(file)}
										>
											<DocumentTextIcon className="size-5 shrink-0 text-foreground-muted" />
											<span className="min-w-0">
												<span className="block truncate text-sm font-medium text-foreground">
													{file.name}
												</span>
												<span className="block text-xs text-foreground-muted">
													{formatFileSize(file.size)}
												</span>
											</span>
										</button>
										<button
											type="button"
											aria-label={`Remove ${file.name}`}
											className="rounded-md p-2 text-foreground-muted hover:bg-canvas hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
											onClick={() => removeSourceFile(file)}
										>
											<XMarkIcon className="size-4" />
										</button>
									</li>
								);
							})}
						</ul>

						<RawPreview file={activeFile} state={activePreviewState} />
					</div>

					<p className="text-sm text-foreground-muted">
						These files remain in this browser until server storage is added.
					</p>
				</>
			)}
		</div>
	);
}

function EmptyBundle({
	inputRef,
	onSelect,
}: {
	inputRef: React.RefObject<HTMLInputElement | null>;
	onSelect: (files: FileList | null) => void;
}) {
	return (
		<label className="grid min-h-72 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border-strong bg-surface-muted p-8 text-center hover:border-accent focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
			<span>
				<ArrowUpTrayIcon className="mx-auto size-10 text-foreground-muted" />
				<span className="mt-4 block font-semibold text-foreground">Drop files here</span>
				<span className="mt-1 block text-sm text-foreground-muted">or choose files</span>
			</span>
			<input
				ref={inputRef}
				type="file"
				multiple
				className="sr-only"
				onChange={(event) => onSelect(event.currentTarget.files)}
			/>
		</label>
	);
}

function RawPreview({
	file,
	state,
}: {
	file: File | undefined;
	state: ActivePreviewState | undefined;
}) {
	return (
		<section className="min-w-0 rounded-xl border border-border bg-surface">
			<div className="border-b border-border px-4 py-3">
				<Subheading>Raw text preview</Subheading>
				{file ? <p className="mt-1 truncate text-sm text-foreground-muted">{file.name}</p> : null}
			</div>
			<div className="p-4" aria-busy={state?.status === "loading"}>
				{state?.status === "loading" ? (
					<p className="text-sm text-foreground-muted">Reading preview…</p>
				) : state?.status === "error" ? (
					<p className="text-sm text-danger">The file could not be previewed.</p>
				) : state?.status === "ready" ? (
					<>
						<pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-foreground">
							{state.preview.text || "The preview is empty."}
						</pre>
						<p className="mt-4 text-xs text-foreground-muted">
							Showing {formatFileSize(state.preview.bytesRead)} and {state.preview.linesShown}{" "}
							{state.preview.linesShown === 1 ? "line" : "lines"}
							{state.preview.truncated ? "; the preview is truncated." : "."}
						</p>
					</>
				) : null}
			</div>
		</section>
	);
}

function fileIdentity(file: File): string {
	return `${file.name}\u0000${file.size}\u0000${file.lastModified}\u0000${file.type}`;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} ${bytes === 1 ? "byte" : "bytes"}`;
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
