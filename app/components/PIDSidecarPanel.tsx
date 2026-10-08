import { WrenchScrewdriverIcon } from "@heroicons/react/20/solid";
import { useEffect, useMemo, useRef, useState } from "react";

import {
	SidecarTomlEditor,
	type SidecarTomlEditorHandle,
} from "~/app/components/SidecarTomlEditor.tsx";
import { createFileProbe } from "~/app/lib/FileProbe.ts";
import {
	parseMeasurementSidecar,
	readCsvSidecarPreview,
	type CsvSidecarPreview,
} from "~/app/lib/measurementSidecar.ts";
import type { SidecarDraft } from "~/app/lib/pidSidecarDraft.ts";
import {
	adjacentFinding,
	type PIDSidecarWarning,
	type SidecarEditorNode,
} from "~/app/lib/sidecarEditor.ts";
import { analyzeTomlSidecar } from "~/app/lib/sidecarTomlEditor.ts";

type CsvComparison =
	| { file: File; source: string; status: "ready"; preview: CsvSidecarPreview }
	| { file: File; source: string; status: "error" };

function todoLabel(path: string) {
	const parts = path.split(".");
	const field = (value: string) => value.replaceAll("_", " ");
	if (parts[0] === "columns" && /^\d+$/.test(parts[1] ?? ""))
		return `Column ${Number(parts[1]) + 1}: ${parts.slice(2).map(field).join(" · ")}`;
	if (parts[0] === "experiment" && parts[1] === "samples" && /^\d+$/.test(parts[2] ?? ""))
		return `Sample ${Number(parts[2]) + 1}: ${parts.slice(3).map(field).join(" · ")}`;
	return parts.map(field).join(" · ");
}

export function PIDSidecarPanel({
	fileName,
	rigSlug,
	initialToml,
	draft,
	setDraft,
	csvFile,
	setCsvFile,
	warnings,
	nodes,
	symbolFocus,
	onSymbolSelectionChange,
}: {
	fileName: string;
	rigSlug: string;
	initialToml: string;
	draft?: SidecarDraft;
	setDraft: (
		rigSlug: string,
		initialToml: string,
		update: (draft: SidecarDraft) => SidecarDraft,
	) => void;
	csvFile: File | null;
	setCsvFile: (file: File | null) => void;
	warnings: PIDSidecarWarning[];
	nodes: SidecarEditorNode[];
	symbolFocus?: { key: string; request: number } | null;
	onSymbolSelectionChange?: (key: string | null) => void;
}) {
	const currentDraft = draft?.initialToml === initialToml ? draft : undefined;
	const source = currentDraft?.source ?? initialToml;
	const setSource = (value: string) =>
		setDraft(rigSlug, initialToml, (current) => ({ ...current, source: value }));
	const setExported = (value: string) =>
		setDraft(rigSlug, initialToml, (current) => ({ ...current, exported: value }));
	const [message, setMessage] = useState("");
	const [jumpedColumn, setJumpedColumn] = useState<{ index: number; name: string } | null>(null);
	const [selectedSymbolKey, setSelectedSymbolKey] = useState<string | null>(null);
	const [csvComparison, setCsvComparison] = useState<CsvComparison>();
	const csvInput = useRef<HTMLInputElement>(null);
	const editor = useRef<SidecarTomlEditorHandle>(null);
	const lastFocusRequest = useRef(0);
	const analysis = useMemo(() => analyzeTomlSidecar(source, nodes), [source, nodes]);
	const parsedSidecar = useMemo(() => parseMeasurementSidecar(source), [source]);
	const comparison =
		csvComparison?.file === csvFile && csvComparison.source === source ? csvComparison : undefined;
	const hasFindings = analysis.todos.length + analysis.issues.length > 0;
	const ready =
		!hasFindings &&
		warnings.length === 0 &&
		(!csvFile ||
			(comparison?.status === "ready" &&
				comparison.preview.issues.length === 0 &&
				comparison.preview.rows.length > 0));
	const exportStatus =
		warnings.length > 0
			? "Complete the linked symbol information."
			: hasFindings
				? "Complete the TOML findings."
				: csvFile && !comparison
					? "Checking the selected CSV."
					: comparison?.status === "error"
						? "The selected CSV could not be read. Select it again."
						: comparison?.status === "ready" && comparison.preview.issues.length > 0
							? "Resolve the CSV comparison issues."
							: comparison?.status === "ready" && comparison.preview.rows.length === 0
								? "The selected CSV has no data rows in the preview."
								: csvFile
									? "The CSV preview matches the sidecar structure."
									: "No sidecar issues found.";
	const changed = source !== initialToml;
	const selectedNode = nodes.find((node) => node.symbolKey === selectedSymbolKey);
	const findings = [...analysis.todos, ...analysis.issues].sort((a, b) => a.from - b.from);
	const firstFinding = findings[0];

	useEffect(() => {
		if (!csvFile || !parsedSidecar.sidecar) return;
		let cancelled = false;
		void readCsvSidecarPreview(createFileProbe(csvFile), parsedSidecar.sidecar).then(
			(preview) => {
				if (!cancelled) setCsvComparison({ file: csvFile, source, status: "ready", preview });
			},
			() => {
				if (!cancelled) setCsvComparison({ file: csvFile, source, status: "error" });
			},
		);
		return () => {
			cancelled = true;
		};
	}, [csvFile, parsedSidecar, source]);

	useEffect(() => setMessage(""), [csvFile]);

	useEffect(() => {
		if (!symbolFocus || symbolFocus.request === lastFocusRequest.current) return;
		lastFocusRequest.current = symbolFocus.request;
		setSelectedSymbolKey(symbolFocus.key);
		const reference =
			analysis.references.find(
				(candidate) => candidate.key === symbolFocus.key && candidate.path.startsWith("columns."),
			) ?? analysis.references.find((candidate) => candidate.key === symbolFocus.key);
		if (reference) {
			setJumpedColumn(null);
			editor.current?.focusAt(reference.from, reference.to);
		}
	}, [analysis, symbolFocus]);

	function focusFinding(from: number, to: number) {
		setJumpedColumn(null);
		editor.current?.focusAt(from, to);
	}

	function moveToFinding(direction: -1 | 1) {
		const selection = editor.current?.selectionRange() ?? { from: 0, to: 0 };
		const finding = adjacentFinding(
			findings,
			selection.from,
			direction,
			selection.from === selection.to,
		);
		if (finding) focusFinding(finding.from, finding.to);
	}

	function focusColumn(index: number, name: string) {
		const range =
			analysis.rangeForPath(`columns.${index}.name`) ?? analysis.rangeForPath(`columns.${index}`);
		if (!range) return;
		editor.current?.focusAt(range[0], range[1], true);
		setJumpedColumn({ index, name });
	}

	function applyCsvHeader(index: number, csvHeader: string) {
		const range = analysis.rangeForPath(`columns.${index}.name`);
		if (!range) return;
		setSource(`${source.slice(0, range[0])}${JSON.stringify(csvHeader)}${source.slice(range[1])}`);
		setMessage("");
	}

	function download() {
		const url = URL.createObjectURL(new Blob([source], { type: "application/toml;charset=utf-8" }));
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		link.click();
		window.setTimeout(() => URL.revokeObjectURL(url), 0);
		setExported(source);
		setMessage(ready ? "Sidecar downloaded." : "Draft downloaded.");
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(source);
			setExported(source);
			setMessage(ready ? "Sidecar copied." : "Draft copied.");
		} catch {
			setMessage("Copy failed. Select the text to copy it.");
		}
	}

	return (
		<section aria-label="Measurement sidecar editor" className="min-w-0 space-y-4">
			<div aria-live="polite" className="text-sm">
				<p className={ready ? "text-foreground-muted" : "text-warning-surface-foreground"}>
					{ready ? exportStatus : `Not ready for import. ${exportStatus}`}
				</p>
			</div>
			<div className="space-y-2">
				<p className="text-sm text-foreground-muted">
					{analysis.todos.length} {analysis.todos.length === 1 ? "TODO" : "TODOs"} ·{" "}
					{analysis.issues.length} {analysis.issues.length === 1 ? "issue" : "issues"}
				</p>
				<div className="flex flex-wrap gap-2">
					{firstFinding ? (
						<button
							type="button"
							onClick={() => focusFinding(firstFinding.from, firstFinding.to)}
							className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
						>
							Edit first finding
						</button>
					) : null}
					<button
						type="button"
						aria-label="Previous TODO or issue"
						onClick={() => moveToFinding(-1)}
						disabled={!hasFindings}
						className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
					>
						Previous
					</button>
					<button
						type="button"
						aria-label="Next TODO or issue"
						onClick={() => moveToFinding(1)}
						disabled={!hasFindings}
						className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
					>
						Next
					</button>
					<button
						type="button"
						disabled={!changed}
						onClick={() => {
							if (window.confirm("Replace your edits with the generated skeleton?"))
								setSource(initialToml);
						}}
						className="ml-auto rounded-lg px-2 py-2 text-sm text-foreground-muted hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
					>
						Reset draft
					</button>
				</div>
			</div>
			{selectedNode ? (
				<p className="text-sm text-foreground-muted">
					Selected symbol: {selectedNode.label} ({selectedNode.symbolKey})
				</p>
			) : null}
			<div className="flex min-h-96 flex-col overflow-hidden rounded-lg border border-border">
				{jumpedColumn ? (
					<p
						role="status"
						className="border-b border-border bg-info-surface px-3 py-2 text-xs font-medium text-info-surface-foreground"
					>
						TOML column {jumpedColumn.index + 1}: {jumpedColumn.name || "Unnamed column"}
					</p>
				) : null}
				<SidecarTomlEditor
					ref={editor}
					value={source}
					nodes={nodes}
					selectedSymbolKey={selectedSymbolKey}
					jumpMarkerActive={jumpedColumn !== null}
					onJumpClear={() => setJumpedColumn(null)}
					onChange={(value) => {
						setSource(value);
						setMessage("");
						setJumpedColumn(null);
					}}
					onSelectSymbol={(key) => {
						setSelectedSymbolKey(key);
						onSymbolSelectionChange?.(key);
					}}
				/>
			</div>
			<div className="space-y-4">
				{analysis.todos.length > 0 ? (
					<div>
						<p className="text-sm font-medium text-foreground">Values to complete</p>
						<ul aria-label="TOML values to complete" className="mt-1 space-y-1 text-sm">
							{analysis.todos.map((todo, index) => (
								<li key={`${todo.from}-${index}`}>
									<button
										type="button"
										className="text-left text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
										onClick={() => focusFinding(todo.from, todo.to)}
									>
										Line {source.slice(0, todo.from).split("\n").length}: {todoLabel(todo.path)}
									</button>
								</li>
							))}
						</ul>
					</div>
				) : null}
				{analysis.issues.length > 0 ? (
					<ul aria-label="TOML issues" className="space-y-1 text-sm text-danger">
						{analysis.issues.map((issue, index) => (
							<li key={`${issue.from}-${index}`}>
								<button
									type="button"
									className="text-left hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
									onClick={() => focusFinding(issue.from, issue.to)}
								>
									Line {source.slice(0, issue.from).split("\n").length}: {issue.message}
								</button>
							</li>
						))}
					</ul>
				) : null}
				{warnings.length > 0 ? (
					<div className="rounded-lg border border-warning-border bg-warning-surface p-3 text-sm text-warning-surface-foreground">
						<p className="font-semibold">Some linked symbols need sidecar information.</p>
						<ul className="mt-2 list-disc space-y-1 pl-5">
							{warnings.map((warning) => (
								<li key={warning.nodeId}>{warning.message}</li>
							))}
						</ul>
					</div>
				) : null}
			</div>
			<div className="space-y-2 border-t border-border pt-4">
				<p className="text-sm font-medium text-foreground">Export sidecar</p>
				<p className="text-sm text-foreground-muted">
					{ready
						? "Download or copy the completed sidecar for import."
						: "You can download or copy this draft before it is ready for import."}
				</p>
				{message ? (
					<p role="status" className="text-sm text-foreground-muted">
						{message}
					</p>
				) : null}
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={download}
						className={`rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${ready ? "bg-accent text-accent-foreground hover:bg-accent-hover" : "border border-border hover:bg-surface-muted"}`}
					>
						Download TOML
					</button>
					<button
						type="button"
						onClick={() => void copy()}
						className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
					>
						Copy TOML
					</button>
				</div>
			</div>
			<details className="text-sm text-foreground-muted">
				<summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
					About this template
				</summary>
				<p className="mt-2">
					Ideally, lab software writes a TOML sidecar alongside each CSV. This template contains the
					rig's diagram mappings. Edit it when a manual sidecar is needed.
				</p>
			</details>
			<div className="space-y-4">
				<details className="rounded-lg border border-border">
					<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
						Check a CSV (optional)
					</summary>
					<div className="space-y-3 px-3 pb-3 text-sm">
						<label className="block text-foreground-muted">
							Choose a CSV to check its columns and up to five data rows. This check reads the file
							in your browser; it does not upload it.
							<input
								ref={csvInput}
								type="file"
								accept=".csv,text/csv"
								onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
								className="mt-2 block w-full min-w-0 text-sm text-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-2 file:font-semibold hover:file:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
							/>
						</label>
						{csvFile ? (
							<button
								type="button"
								onClick={() => {
									setCsvFile(null);
									if (csvInput.current) csvInput.current.value = "";
								}}
								className="text-sm text-foreground-muted underline hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
							>
								Remove CSV
							</button>
						) : null}
						{csvFile && !parsedSidecar.sidecar ? (
							<p className="text-foreground-muted">Correct the TOML issues to compare this CSV.</p>
						) : csvFile && !comparison ? (
							<p role="status" className="text-foreground-muted">
								Checking {csvFile.name}…
							</p>
						) : comparison?.status === "error" ? (
							<p role="alert" className="text-danger">
								The CSV could not be read. Select it again.
							</p>
						) : comparison?.status === "ready" ? (
							<div className="space-y-2">
								<p className="break-all text-foreground-muted">{csvFile?.name}</p>
								<div className="overflow-x-auto rounded-lg border border-border">
									<table className="w-full min-w-96 text-left text-xs">
										<thead className="bg-surface-muted text-foreground-muted">
											<tr>
												<th scope="col" className="px-2 py-1">
													#
												</th>
												<th scope="col" className="px-2 py-1">
													TOML column
												</th>
												<th scope="col" className="px-2 py-1">
													{comparison.preview.header ? "CSV header" : "First CSV value"}
												</th>
											</tr>
										</thead>
										<tbody>
											{comparison.preview.columns.map((name, index) => (
												<tr key={index} className="border-t border-border">
													<td className="px-2 py-1 text-foreground-muted">{index + 1}</td>
													<td className="break-all px-2 py-1">
														<button
															type="button"
															onClick={() => focusColumn(index, name)}
															aria-label={`Edit TOML column ${index + 1}: ${name || "unnamed"}`}
															className="text-left text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
														>
															{name || "—"}
														</button>
													</td>
													<td className="break-all px-2 py-1">
														<div className="flex items-center gap-1">
															<button
																type="button"
																onClick={() => focusColumn(index, name)}
																aria-label={`Edit TOML column ${index + 1} for ${comparison.preview.header ? "CSV header" : "CSV value"}: ${(comparison.preview.header ?? comparison.preview.rows[0])?.[index] || "empty"}`}
																className="min-w-0 text-left text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
															>
																{(comparison.preview.header ?? comparison.preview.rows[0])?.[
																	index
																] || "—"}
															</button>
															{comparison.preview.header?.[index] !== undefined &&
															comparison.preview.header[index] !== name ? (
																<button
																	type="button"
																	onClick={() =>
																		applyCsvHeader(index, comparison.preview.header![index]!)
																	}
																	aria-label={`Use CSV header ${comparison.preview.header[index] || "empty"} for TOML column ${index + 1}`}
																	title="Use CSV header in TOML"
																	className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
																>
																	<WrenchScrewdriverIcon className="size-4" aria-hidden="true" />
																</button>
															) : null}
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
								{comparison.preview.timestamp ? (
									<div className="space-y-1 border-t border-border pt-3">
										<p className="font-medium text-foreground">
											Timestamp preview · first data row
										</p>
										<dl className="space-y-1">
											<div>
												<dt className="inline text-foreground-muted">CSV value: </dt>
												<dd className="inline break-all text-foreground">
													{comparison.preview.timestamp.source}
												</dd>
											</div>
											<div>
												<dt className="inline text-foreground-muted">Format: </dt>
												<dd className="inline break-all text-foreground">
													{comparison.preview.timestamp.format}
												</dd>
											</div>
											<div>
												<dt className="inline text-foreground-muted">Timezone: </dt>
												<dd className="inline text-foreground">
													{comparison.preview.timestamp.timezone}
												</dd>
											</div>
											<div>
												<dt className="inline text-foreground-muted">Interpreted UTC instant: </dt>
												<dd
													className={`inline break-all ${comparison.preview.timestamp.interpreted ? "text-foreground" : "text-danger"}`}
												>
													{comparison.preview.timestamp.interpreted ?? "Invalid or ambiguous"}
												</dd>
											</div>
										</dl>
									</div>
								) : null}
								{comparison.preview.issues.length > 0 ? (
									<ul role="alert" className="list-disc space-y-1 pl-5 text-danger">
										{comparison.preview.issues.map((issue, index) => (
											<li key={`${issue.path}-${index}`}>{issue.message}</li>
										))}
									</ul>
								) : comparison.preview.rows.length === 0 ? (
									<p className="text-foreground-muted">No data rows appear in the CSV preview.</p>
								) : (
									<p className="text-foreground-muted">
										{comparison.preview.header ? "The CSV header and " : "The "}
										{comparison.preview.rows.length} preview data{" "}
										{comparison.preview.rows.length === 1 ? "row matches" : "rows match"} the
										sidecar structure. Import checks the full file.
									</p>
								)}
							</div>
						) : null}
					</div>
				</details>
			</div>
		</section>
	);
}
