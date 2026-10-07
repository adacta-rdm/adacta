import {
	ArrowUpTrayIcon,
	CheckCircleIcon,
	CodeBracketIcon,
	DocumentTextIcon,
	ExclamationTriangleIcon,
	TableCellsIcon,
	XMarkIcon,
} from "@heroicons/react/20/solid";
import clsx from "clsx";
import {
	useEffect,
	useRef,
	useState,
	type ReactNode,
	type RefObject,
	type SubmitEventHandler,
} from "react";
import { Form } from "react-router";

import { TomlCode } from "~/app/components/TomlCode.tsx";
import { createFileProbe } from "~/app/lib/FileProbe.ts";
import { matchingSourceReferences, type ImportSuggestion } from "~/app/lib/importSuggestion.ts";
import {
	findMeasurementSidecarPair,
	readCsvSidecarPreview,
	readMeasurementSidecar,
	type CsvSidecarPreview,
	type MeasurementSidecar,
	type MeasurementSidecarPair,
	type SidecarIssue,
} from "~/app/lib/measurementSidecar.ts";
import {
	parseCsvPreview,
	readTextPreview,
	type CsvPreview,
	type TextPreview,
} from "~/app/lib/textPreview.ts";
import { Subheading } from "~/catalyst-ui/heading.tsx";

type PreviewState =
	| { file: File; status: "ready"; preview: TextPreview; csv?: CsvPreview }
	| { file: File; status: "error" };

type ActivePreviewState = PreviewState | { status: "loading" };

type BundlePreviewState =
	| { pair: MeasurementSidecarPair; status: "idle" }
	| { pair: Extract<MeasurementSidecarPair, { status: "paired" }>; status: "loading" }
	| {
			pair: Extract<MeasurementSidecarPair, { status: "paired" }>;
			status: "ready";
			sidecar?: MeasurementSidecar;
			issues: SidecarIssue[];
			csv?: CsvSidecarPreview;
	  };

export function UploadForm({
	action,
	files,
	suggestion,
	measurementMode = false,
	isUploading,
	uploadError,
	onAddFiles,
	onRemoveFile,
	onClear,
	onSubmit,
}: {
	action?: string;
	files: File[];
	suggestion?: ImportSuggestion;
	measurementMode?: boolean;
	isUploading: boolean;
	uploadError?: string;
	onAddFiles: (files: File[]) => void;
	onRemoveFile: (file: File) => void;
	onClear: () => void;
	onSubmit: SubmitEventHandler<HTMLFormElement>;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [selectedFile, setSelectedFile] = useState<File>();
	const activeFile = selectedFile && files.includes(selectedFile) ? selectedFile : files[0];
	const [previewState, setPreviewState] = useState<PreviewState>();
	const pair = measurementMode ? findMeasurementSidecarPair(files) : ({ status: "none" } as const);
	const [resolvedBundlePreview, setResolvedBundlePreview] = useState<
		Extract<BundlePreviewState, { status: "ready" }> | undefined
	>();
	const bundlePreview: BundlePreviewState =
		pair.status !== "paired"
			? { pair, status: "idle" }
			: resolvedBundlePreview?.pair.csv === pair.csv &&
				  resolvedBundlePreview.pair.sidecar === pair.sidecar
				? resolvedBundlePreview
				: { pair, status: "loading" };
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
				if (!cancelled) {
					const csv = /\.csv$/i.test(activeFile.name) ? parseCsvPreview(preview) : undefined;
					setPreviewState({ file: activeFile, status: "ready", preview, csv });
				}
			},
			() => {
				if (!cancelled) setPreviewState({ file: activeFile, status: "error" });
			},
		);

		return () => {
			cancelled = true;
		};
	}, [activeFile]);

	useEffect(() => {
		if (!measurementMode) return;
		const pair = findMeasurementSidecarPair(files);
		if (pair.status !== "paired") return;

		let cancelled = false;
		void readMeasurementSidecar(createFileProbe(pair.sidecar))
			.then(async (result) => {
				if (!result.sidecar) return { result };
				const csv = await readCsvSidecarPreview(createFileProbe(pair.csv), result.sidecar);
				return { result, csv };
			})
			.then(
				({ result, csv }) => {
					if (cancelled) return;
					setResolvedBundlePreview({
						pair,
						status: "ready",
						sidecar: result.sidecar,
						issues: result.issues,
						csv,
					});
				},
				(error: unknown) => {
					if (cancelled) return;
					setResolvedBundlePreview({
						pair,
						status: "ready",
						issues: [
							{
								path: "files",
								message:
									error instanceof Error ? error.message : "The pair could not be previewed.",
							},
						],
					});
				},
			);

		return () => {
			cancelled = true;
		};
	}, [files, measurementMode]);

	function selectFiles(selected: FileList | null) {
		const selectedFiles = selected ? [...selected] : [];
		if (selectedFiles.length > 0) onAddFiles(selectedFiles);
		if (inputRef.current) inputRef.current.value = "";
	}

	return (
		<Form
			action={action}
			method="post"
			encType="multipart/form-data"
			className="mt-8 space-y-8"
			onSubmit={onSubmit}
		>
			{suggestion ? <DropSuggestion suggestion={suggestion} state={bundlePreview} /> : null}
			{files.length === 0 ? (
				<EmptyUpload inputRef={inputRef} onSelect={selectFiles} />
			) : (
				<>
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<Subheading>Files to upload</Subheading>
							<p className="mt-1 text-sm text-foreground-muted">
								{files.length} {files.length === 1 ? "file" : "files"}
							</p>
						</div>
						<div className="flex items-center gap-3">
							<button
								type="button"
								disabled={isUploading}
								className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
								onClick={onClear}
							>
								Clear
							</button>
							<label className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
								Add files
								<input
									ref={inputRef}
									type="file"
									multiple
									disabled={isUploading}
									className="sr-only"
									onChange={(event) => selectFiles(event.currentTarget.files)}
								/>
							</label>
							<button
								type="submit"
								disabled={isUploading || files.length === 0}
								className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isUploading
									? measurementMode
										? "Importing…"
										: "Uploading…"
									: uploadError
										? "Try again"
										: measurementMode
											? "Import measurements"
											: "Upload files"}
							</button>
						</div>
					</div>

					{measurementMode ? <BundleStatus state={bundlePreview} /> : null}

					<div className="grid gap-6 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
						<ul className="space-y-2" aria-label="Files to upload">
							{files.map((file) => {
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
											disabled={isUploading}
											className="rounded-md p-2 text-foreground-muted hover:bg-canvas hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
											onClick={() => onRemoveFile(file)}
										>
											<XMarkIcon className="size-4" />
										</button>
									</li>
								);
							})}
						</ul>

						<FilePreview file={activeFile} state={activePreviewState} bundle={bundlePreview} />
					</div>

					{uploadError ? (
						<p role="alert" className="text-sm text-danger">
							{uploadError}
						</p>
					) : (
						<p className="text-sm text-foreground-muted">
							Files remain in this browser until they are stored.
						</p>
					)}
				</>
			)}
		</Form>
	);
}

function DropSuggestion({
	suggestion,
	state,
}: {
	suggestion: ImportSuggestion;
	state: BundlePreviewState;
}) {
	const references =
		state.status === "ready" && state.sidecar
			? matchingSourceReferences(state.sidecar, suggestion)
			: undefined;
	return (
		<section className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
			<p className="font-semibold text-foreground">Drop location: Rig · {suggestion.name}</p>
			<p className="mt-1 text-foreground-muted">
				{references
					? `${references.columns.matched} of ${references.columns.total} measurement columns use symbols on this rig.`
					: "This location is a suggestion. The TOML sidecar supplies the recorded associations."}
			</p>
			{references && references.samples.total > 0 ? (
				<p className="mt-1 text-foreground-muted">
					{references.samples.matched} of {references.samples.total} sample references use symbols
					on this rig.
				</p>
			) : null}
			{references ? (
				<p className="mt-1 text-foreground-muted">
					Review the sidecar before import. Other items in the same file remain separate.
				</p>
			) : null}
		</section>
	);
}

function BundleStatus({ state }: { state: BundlePreviewState }) {
	if (state.pair.status === "none") return null;
	if (state.pair.status === "ambiguous") {
		return (
			<div className="flex gap-3 rounded-lg border border-warning-border bg-warning-surface px-4 py-3 text-sm text-warning-surface-foreground">
				<ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0" />
				<p>{state.pair.message} The files can still be stored unchanged.</p>
			</div>
		);
	}
	if (state.status === "loading") {
		return (
			<p role="status" className="text-sm text-foreground-muted">
				Checking the CSV and TOML sidecar…
			</p>
		);
	}
	if (state.status !== "ready") return null;
	const issues = [...state.issues, ...(state.csv?.issues ?? [])];
	if (issues.length === 0) {
		return (
			<div className="flex gap-3 rounded-lg border border-success-border bg-success-surface px-4 py-3 text-sm text-success-surface-foreground">
				<CheckCircleIcon className="mt-0.5 size-5 shrink-0" />
				<p>
					<strong className="font-semibold">Sidecar matched.</strong> {state.pair.sidecar.name}{" "}
					describes {state.pair.csv.name}.
				</p>
			</div>
		);
	}
	return (
		<div className="rounded-lg border border-warning-border bg-warning-surface px-4 py-3 text-sm text-warning-surface-foreground">
			<div className="flex gap-3">
				<ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0" />
				<div>
					<p className="font-semibold">The sidecar needs attention.</p>
					<p className="mt-0.5">The original files can still be stored unchanged.</p>
				</div>
			</div>
			<ul className="mt-2 list-disc space-y-1 pl-8">
				{issues.map((issue, index) => (
					<li key={`${issue.path}-${index}`}>
						<span className="font-medium">{issue.path}:</span> {issue.message}
					</li>
				))}
			</ul>
		</div>
	);
}

function FilePreview({
	file,
	state,
	bundle,
}: {
	file: File | undefined;
	state: ActivePreviewState | undefined;
	bundle: BundlePreviewState;
}) {
	const hasData =
		bundle.status === "ready" && bundle.sidecar !== undefined && bundle.csv !== undefined;
	const csvPreview = state?.status === "ready" && state.file === file ? state.csv : undefined;
	const hasCsvData = csvPreview !== undefined;
	const [view, setView] = useState<"data" | "raw">("data");
	const selectedView = hasData || hasCsvData ? view : "raw";

	return (
		<section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
				<div>
					<Subheading>
						{selectedView === "data" ? "Parsed data preview" : "Raw text preview"}
					</Subheading>
					{file && selectedView === "raw" ? (
						<p className="mt-1 truncate text-sm text-foreground-muted">{file.name}</p>
					) : hasData ? (
						<p className="mt-1 truncate text-sm text-foreground-muted">{bundle.pair.csv.name}</p>
					) : hasCsvData ? (
						<p className="mt-1 truncate text-sm text-foreground-muted">
							Delimiter: {formatDelimiter(csvPreview.delimiter)}
						</p>
					) : null}
				</div>
				{hasData || hasCsvData ? (
					<div
						role="group"
						className="flex rounded-lg border border-border bg-surface-muted p-0.5"
						aria-label="Preview view"
					>
						<PreviewTab active={selectedView === "data"} onClick={() => setView("data")}>
							<TableCellsIcon className="size-4" /> Data
						</PreviewTab>
						<PreviewTab active={selectedView === "raw"} onClick={() => setView("raw")}>
							<CodeBracketIcon className="size-4" /> Raw
						</PreviewTab>
					</div>
				) : null}
			</div>
			{selectedView === "data" && hasData ? (
				<StructuredPreview preview={bundle.csv!} />
			) : selectedView === "data" && hasCsvData ? (
				<GenericCsvPreview preview={csvPreview} />
			) : (
				<RawPreviewContents state={state} />
			)}
		</section>
	);
}

function GenericCsvPreview({ preview }: { preview: CsvPreview }) {
	const columns = Math.max(...preview.rows.map((row) => row.length), 1);
	return (
		<div className="max-h-[32rem] overflow-auto" aria-label="CSV preview">
			<table className="min-w-full border-collapse whitespace-nowrap text-left text-sm">
				<tbody className="font-mono text-xs text-foreground">
					{preview.rows.map((row, rowIndex) => (
						<tr
							key={rowIndex}
							className={
								rowIndex === 0 ? "bg-surface-muted font-semibold" : "even:bg-surface-muted/50"
							}
						>
							{Array.from({ length: columns }, (_, columnIndex) => (
								<td
									key={columnIndex}
									className="border-r border-b border-border px-3 py-2 last:border-r-0"
								>
									{row[columnIndex] ?? ""}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			<p className="p-3 text-xs text-foreground-muted">
				Showing {preview.rows.length} {preview.rows.length === 1 ? "row" : "rows"}; delimiter:{" "}
				{formatDelimiter(preview.delimiter)}
				{preview.truncated ? "; the preview is bounded." : "."}
			</p>
		</div>
	);
}

function formatDelimiter(delimiter: string): string {
	return delimiter === "\t" ? "TAB" : delimiter;
}

function PreviewTab({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={clsx(
				"flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-focus",
				active
					? "bg-surface text-foreground shadow-sm"
					: "text-foreground-muted hover:text-foreground",
			)}
		>
			{children}
		</button>
	);
}

function StructuredPreview({ preview }: { preview: CsvSidecarPreview }) {
	return (
		<div className="max-h-[32rem] overflow-auto" aria-label="Parsed CSV preview">
			<table className="min-w-full border-collapse whitespace-nowrap text-left text-sm">
				<thead className="sticky top-0 bg-surface-muted text-xs text-foreground-muted">
					<tr>
						{preview.columns.map((column, index) => (
							<th
								key={`${column}-${index}`}
								scope="col"
								className="border-b border-r border-border px-3 py-2 font-semibold last:border-r-0"
							>
								{column}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="font-mono text-xs text-foreground">
					{preview.rows.map((row, rowIndex) => (
						<tr key={rowIndex} className="even:bg-surface-muted/50">
							{preview.columns.map((_, columnIndex) => (
								<td
									key={columnIndex}
									className="border-r border-b border-border px-3 py-2 tabular-nums last:border-r-0"
								>
									{row[columnIndex] ?? <span className="text-danger">Missing</span>}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			{preview.rows.length === 0 ? (
				<p className="p-4 text-sm text-foreground-muted">No data rows were available to preview.</p>
			) : (
				<p className="p-3 text-xs text-foreground-muted">
					Showing {preview.rows.length} {preview.rows.length === 1 ? "row" : "rows"}
					{preview.truncated ? "; the preview is bounded." : "."}
				</p>
			)}
		</div>
	);
}

function EmptyUpload({
	inputRef,
	onSelect,
}: {
	inputRef: RefObject<HTMLInputElement | null>;
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

function RawPreviewContents({ state }: { state: ActivePreviewState | undefined }) {
	return (
		<div className="p-4" aria-busy={state?.status === "loading"}>
			{state?.status === "loading" ? (
				<p className="text-sm text-foreground-muted">Reading preview…</p>
			) : state?.status === "error" ? (
				<p className="text-sm text-danger">The file could not be previewed.</p>
			) : state?.status === "ready" ? (
				<>
					{/\.toml$/i.test(state.file.name) ? (
						<pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-foreground">
							<TomlCode text={state.preview.text} />
						</pre>
					) : (
						<pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-foreground">
							{state.preview.text || "The preview is empty."}
						</pre>
					)}
					<p className="mt-4 text-xs text-foreground-muted">
						Showing {formatFileSize(state.preview.bytesRead)} and {state.preview.linesShown}{" "}
						{state.preview.linesShown === 1 ? "line" : "lines"}
						{state.preview.truncated ? "; the preview is truncated." : "."}
					</p>
				</>
			) : null}
		</div>
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
