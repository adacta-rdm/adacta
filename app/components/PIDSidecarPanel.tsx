import { ExclamationTriangleIcon, WrenchScrewdriverIcon } from "@heroicons/react/20/solid";
import { useEffect, useMemo, useRef, useState } from "react";

import {
	SidecarTomlEditor,
	type SidecarTomlEditorHandle,
} from "~/app/components/SidecarTomlEditor.tsx";
import { createFileProbe } from "~/app/lib/FileProbe.ts";
import {
	parseDatasetSidecar,
	readCsvSidecarPreview,
	type CsvSidecarPreview,
} from "~/app/lib/datasetSidecar.ts";
import type { SidecarDraft } from "~/app/lib/pidSidecarDraft.ts";
import {
	adjacentFinding,
	type PIDSidecarOmission,
	type SidecarEditorNode,
} from "~/app/lib/sidecarEditor.ts";
import { analyzeTomlSidecar } from "~/app/lib/sidecarTomlEditor.ts";
import { Switch } from "~/catalyst-ui/switch.tsx";

type CsvComparison =
	| { file: File; source: string; status: "ready"; preview: CsvSidecarPreview }
	| { file: File; source: string; status: "error" };

export function PIDSidecarPanel({
	fileName,
	rigSlug,
	initialToml,
	draft,
	setDraft,
	csvFile,
	setCsvFile,
	omissions,
	onShowSymbol,
	nodes,
	autoZoomToSelection,
	onAutoZoomToSelectionChange,
	selectedSymbolKey,
	symbolFocus,
	onSymbolSelectionChange,
	onColumnFocus,
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
	omissions: PIDSidecarOmission[];
	onShowSymbol: (nodeId: string) => void;
	nodes: SidecarEditorNode[];
	autoZoomToSelection: boolean;
	onAutoZoomToSelectionChange: (enabled: boolean) => void;
	selectedSymbolKey: string | null;
	symbolFocus?: { key: string; request: number } | null;
	onSymbolSelectionChange?: (key: string | null) => void;
	onColumnFocus?: (key: string) => void;
}) {
	const currentDraft = draft?.initialToml === initialToml ? draft : undefined;
	const source = currentDraft?.source ?? initialToml;
	const setSource = (value: string) =>
		setDraft(rigSlug, initialToml, (current) => ({ ...current, source: value }));
	const setExported = (value: string) =>
		setDraft(rigSlug, initialToml, (current) => ({ ...current, exported: value }));
	const [message, setMessage] = useState("");
	const [jumpedColumn, setJumpedColumn] = useState<{ index: number; name: string } | null>(null);
	const [csvComparison, setCsvComparison] = useState<CsvComparison>();
	const [openPanel, setOpenPanel] = useState<"problems" | "csv" | "help" | null>(null);
	const csvInput = useRef<HTMLInputElement>(null);
	const editor = useRef<SidecarTomlEditorHandle>(null);
	const lastFocusRequest = useRef(0);
	const analysis = useMemo(() => analyzeTomlSidecar(source, nodes), [source, nodes]);
	const parsedSidecar = useMemo(() => parseDatasetSidecar(source), [source]);
	const comparison =
		csvComparison?.file === csvFile && csvComparison.source === source ? csvComparison : undefined;
	const csvProblems =
		comparison?.status === "error"
			? ["The CSV could not be read. Select it again."]
			: comparison?.status === "ready"
				? comparison.preview.issues.length > 0
					? comparison.preview.issues.map((issue) => issue.message)
					: comparison.preview.rows.length === 0
						? ["The selected CSV has no data rows in the preview."]
						: []
				: [];
	const hasFindings = analysis.todos.length + analysis.issues.length > 0;
	const csvCheckDisabled = hasFindings && !csvFile && openPanel !== "csv";
	const ready =
		!hasFindings &&
		(!csvFile ||
			(comparison?.status === "ready" &&
				comparison.preview.issues.length === 0 &&
				comparison.preview.rows.length > 0));
	const exportStatus = hasFindings
		? analysis.todos.length > 0 && analysis.issues.length > 0
			? "Complete missing values and resolve TOML issues."
			: analysis.todos.length > 0
				? "Complete missing values."
				: "Resolve TOML issues."
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
	const issueCount = analysis.issues.length + csvProblems.length;
	const findingCount = analysis.todos.length + issueCount + omissions.length;

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
		<section
			aria-label="Dataset sidecar editor"
			className="flex h-full min-h-0 min-w-0 flex-col gap-3"
		>
			<div className="shrink-0 space-y-2">
				<div className="flex items-center justify-between gap-2">
					<p className="text-sm font-medium text-foreground">Export sidecar</p>
					<button
						type="button"
						aria-expanded={openPanel === "help"}
						onClick={() => setOpenPanel(openPanel === "help" ? null : "help")}
						className="text-xs text-foreground-muted underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
					>
						About this template
					</button>
				</div>
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
					<button
						type="button"
						disabled={!changed}
						onClick={() => {
							if (window.confirm("Replace your edits with the generated skeleton?"))
								setSource(initialToml);
						}}
						className="rounded-lg px-3 py-2 text-sm text-foreground-muted hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
					>
						Reset draft
					</button>
				</div>
			</div>
			<div className="flex shrink-0 items-center justify-between gap-3">
				<p className="min-w-0 truncate text-sm text-foreground-muted">
					Selected symbol:{" "}
					{selectedNode ? `${selectedNode.label} (${selectedNode.symbolKey})` : "None"}
				</p>
				<div className="flex shrink-0 items-center gap-2">
					<span id="sidecar-auto-zoom-label" className="text-xs text-foreground-muted">
						Auto zoom
					</span>
					<Switch
						aria-labelledby="sidecar-auto-zoom-label"
						title="Zoom to the selected P&ID symbol"
						checked={autoZoomToSelection}
						onChange={onAutoZoomToSelectionChange}
					/>
				</div>
			</div>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
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
						onSymbolSelectionChange?.(key);
					}}
					onColumnChange={(key) => {
						if (key) onColumnFocus?.(key);
					}}
				/>
			</div>
			<div className="-mx-4 -mb-4 shrink-0 bg-canvas-sunken lg:border-l lg:border-border">
				{openPanel === "problems" ? (
					<div
						id="sidecar-findings"
						className="max-h-[40svh] space-y-3 overflow-y-auto border-b border-border px-4 py-3 text-sm"
					>
						{analysis.todos.length > 0 ? (
							<section className="rounded-lg border border-warning-border bg-warning-surface p-3 text-warning-surface-foreground">
								<h3 className="font-semibold">Values to complete</h3>
								<p className="mt-1">
									Replace each &lt;VALUE&gt; in the sidecar with the required value.
								</p>
							</section>
						) : null}
						{issueCount > 0 ? (
							<section className="rounded-lg border border-danger-border bg-danger-surface p-3 text-danger-surface-foreground">
								<h3 className="font-semibold">Issues</h3>
								{analysis.issues.length > 0 ? (
									<div className="mt-2">
										<p className="font-medium">TOML</p>
										<ul className="mt-1 space-y-1" aria-label="TOML issues">
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
									</div>
								) : null}
								{csvProblems.length > 0 ? (
									<div className="mt-2">
										<p className="font-medium">CSV</p>
										<ul className="mt-1 list-disc space-y-1 pl-5">
											{csvProblems.map((problem, index) => (
												<li key={index}>{problem}</li>
											))}
										</ul>
									</div>
								) : null}
							</section>
						) : null}
						{omissions.length > 0 ? (
							<SidecarOmissions omissions={omissions} onShowSymbol={onShowSymbol} />
						) : null}
						{findingCount === 0 ? <p className="text-foreground-muted">No findings.</p> : null}
					</div>
				) : openPanel === "csv" ? (
					<div
						id="sidecar-csv"
						className="max-h-[40svh] space-y-3 overflow-y-auto border-b border-border px-4 py-3 text-sm"
					>
						<p className="font-medium text-foreground">Check a CSV</p>
						<div className="space-y-3">
							<label className="block text-foreground-muted">
								Choose a CSV to check its columns and up to five data rows. This check reads the
								file in your browser; it does not upload it.
								<input
									ref={csvInput}
									type="file"
									accept=".csv,text/csv"
									disabled={hasFindings}
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
								<p className="text-foreground-muted">
									Correct the TOML issues to compare this CSV.
								</p>
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
													<dt className="inline text-foreground-muted">
														Interpreted UTC instant:{" "}
													</dt>
													<dd
														className={`inline break-all ${comparison.preview.timestamp.interpreted ? "text-foreground" : "text-danger"}`}
													>
														{comparison.preview.timestamp.interpreted ?? "Invalid or ambiguous"}
													</dd>
												</div>
											</dl>
										</div>
									) : null}
									{comparison.preview.numericAxis ? (
										<div className="space-y-1 border-t border-border pt-3">
											<p className="font-medium text-foreground">
												Numeric axis preview · first data row
											</p>
											<p>
												<span className="text-foreground-muted">CSV value: </span>
												{comparison.preview.numericAxis.source}
											</p>
											<p>
												<span className="text-foreground-muted">Interpreted value: </span>
												{comparison.preview.numericAxis.interpreted ?? "Invalid"}{" "}
												{comparison.preview.numericAxis.unit}
											</p>
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
					</div>
				) : openPanel === "help" ? (
					<div
						id="sidecar-help"
						className="max-h-[40svh] overflow-y-auto border-b border-border px-4 py-3 text-sm text-foreground-muted"
					>
						<p className="font-medium text-foreground">About this template</p>
						<p className="mt-1">
							Ideally, lab software writes a TOML sidecar alongside each CSV. This template contains
							the rig's diagram mappings. Edit it when a manual sidecar is needed.
						</p>
					</div>
				) : null}
				<div className="space-y-2 px-4 py-2">
					<p
						aria-live="polite"
						className={
							ready
								? "text-sm text-foreground-muted"
								: "flex items-start gap-2 rounded-lg border border-warning-border bg-warning-surface px-3 py-2 text-sm text-foreground"
						}
					>
						{ready ? (
							exportStatus
						) : (
							<>
								<ExclamationTriangleIcon
									aria-hidden="true"
									className="mt-0.5 size-4 shrink-0 text-warning"
								/>
								<span>
									<strong className="font-semibold">Not ready for import.</strong> {exportStatus}
								</span>
							</>
						)}
					</p>
					<div className="flex items-center justify-between gap-2">
						<p className="text-sm font-medium text-foreground">Findings</p>
						{findingCount > 0 ? (
							<button
								type="button"
								aria-expanded={openPanel === "problems"}
								aria-label={
									openPanel === "problems" ? "Hide finding details" : "View finding details"
								}
								onClick={() => setOpenPanel(openPanel === "problems" ? null : "problems")}
								className="rounded-md border border-border px-2 py-1 text-xs font-medium text-accent hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
							>
								{openPanel === "problems" ? "Hide details" : "View details"}
							</button>
						) : null}
					</div>
					<FindingSummary
						values={analysis.todos.length}
						issues={issueCount}
						omissions={omissions.length}
					/>
					<div className="flex flex-wrap gap-1">
						{firstFinding ? (
							<button
								type="button"
								onClick={() => focusFinding(firstFinding.from, firstFinding.to)}
								className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
							>
								Edit first finding
							</button>
						) : null}
						<button
							type="button"
							aria-label="Previous value to complete or issue"
							onClick={() => moveToFinding(-1)}
							disabled={!hasFindings}
							className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
						>
							Previous
						</button>
						<button
							type="button"
							aria-label="Next value to complete or issue"
							onClick={() => moveToFinding(1)}
							disabled={!hasFindings}
							className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
						>
							Next
						</button>
						<div className="group relative ml-auto">
							<button
								type="button"
								aria-expanded={openPanel === "csv"}
								aria-disabled={csvCheckDisabled}
								aria-describedby={csvCheckDisabled ? "csv-check-requirements" : undefined}
								onClick={() => {
									if (!csvCheckDisabled) setOpenPanel(openPanel === "csv" ? null : "csv");
								}}
								className="rounded-md border border-border px-2 py-1 text-xs font-medium text-accent hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-disabled:cursor-not-allowed aria-disabled:text-foreground-muted aria-disabled:opacity-50"
							>
								{openPanel === "csv" ? "Hide CSV check" : "Validate against CSV"}
							</button>
							{csvCheckDisabled ? (
								<p
									id="csv-check-requirements"
									role="tooltip"
									className="pointer-events-none absolute right-0 bottom-full z-10 mb-2 w-56 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
								>
									{exportStatus}
								</p>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function FindingSummary({
	values,
	issues,
	omissions,
}: {
	values: number;
	issues: number;
	omissions: number;
}) {
	const findings = [
		{
			label: "Values to complete",
			count: values,
			style:
				values > 0
					? "border-warning-border bg-warning-surface text-warning-surface-foreground"
					: "border-border bg-surface-muted text-foreground",
		},
		{
			label: "Issues",
			count: issues,
			style:
				issues > 0
					? "border-danger-border bg-danger-surface text-danger-surface-foreground"
					: "border-border bg-surface-muted text-foreground",
		},
		{
			label: "P&ID omissions",
			count: omissions,
			style:
				omissions > 0
					? "border-info-border bg-info-surface text-info-surface-foreground"
					: "border-border bg-surface-muted text-foreground",
		},
	];

	return (
		<dl className="grid grid-cols-3 gap-1.5">
			{findings.map((finding) => (
				<div
					key={finding.label}
					className={`flex flex-col-reverse rounded-md border px-2 py-1 ${finding.style}`}
				>
					<dt className="text-xs leading-4">{finding.label}</dt>
					<dd className="text-base font-semibold leading-5">{finding.count}</dd>
				</div>
			))}
		</dl>
	);
}

function SidecarOmissions({
	omissions,
	onShowSymbol,
}: {
	omissions: PIDSidecarOmission[];
	onShowSymbol: (nodeId: string) => void;
}) {
	const groups = (
		[
			{ reason: "missing-symbol-key", heading: "No diagram symbol key" },
			{ reason: "missing-product", heading: "No usable catalog product" },
			{ reason: "missing-channels", heading: "No product channels" },
		] as const
	).map((group) => ({
		...group,
		symbols: omissions.filter((omission) => omission.reason === group.reason),
	}));

	return (
		<aside
			aria-labelledby="sidecar-omissions-heading"
			className="rounded-lg border border-info-border bg-info-surface p-3 text-sm text-info-surface-foreground"
		>
			<h3 id="sidecar-omissions-heading" className="font-semibold">
				P&amp;ID symbols omitted from this sidecar
			</h3>
			<ul className="mt-1 space-y-3">
				{groups
					.filter((group) => group.symbols.length > 0)
					.map((group) => (
						<li
							key={group.reason}
							className="border-t border-info-border pt-3 first:border-t-0 first:pt-0"
						>
							<p className="font-semibold">{group.heading}</p>
							<p className="mt-1">
								{group.symbols.map((omission, index) => (
									<span key={omission.nodeId}>
										{index > 0 ? ", " : null}
										<button
											type="button"
											onClick={() => onShowSymbol(omission.nodeId)}
											className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
											aria-label={`Show ${omission.label || "unnamed symbol"} in the diagram`}
										>
											{omission.label || "Unnamed symbol"}
										</button>
									</span>
								))}
							</p>
							<p className="mt-1">{omissionGuidance(group.reason)}</p>
						</li>
					))}
			</ul>
		</aside>
	);
}

function omissionGuidance(reason: PIDSidecarOmission["reason"]): string {
	if (reason === "missing-symbol-key")
		return "Add a key to each symbol in Edit diagram, then save.";
	if (reason === "missing-product")
		return "Choose equipment with a catalog product in Edit diagram, then save.";
	return "Choose equipment whose product defines channels in Edit diagram, then save.";
}
