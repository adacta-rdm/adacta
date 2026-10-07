import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router";

import {
	SidecarTomlEditor,
	type SidecarTomlEditorHandle,
} from "~/app/components/SidecarTomlEditor.tsx";
import {
	adjacentFinding,
	type PIDSidecarWarning,
	type SidecarEditorNode,
} from "~/app/lib/sidecarEditor.ts";
import { analyzeTomlSidecar } from "~/app/lib/sidecarTomlEditor.ts";

export function PIDSidecarPanel({
	fileName,
	initialToml,
	warnings,
	nodes,
	symbolFocus,
	onSymbolSelectionChange,
}: {
	fileName: string;
	initialToml: string;
	warnings: PIDSidecarWarning[];
	nodes: SidecarEditorNode[];
	symbolFocus?: { key: string; request: number } | null;
	onSymbolSelectionChange?: (key: string | null) => void;
}) {
	const [source, setSource] = useState(initialToml);
	const [exported, setExported] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [selectedSymbolKey, setSelectedSymbolKey] = useState<string | null>(null);
	const editor = useRef<SidecarTomlEditorHandle>(null);
	const lastFocusRequest = useRef(0);
	const analysis = useMemo(() => analyzeTomlSidecar(source, nodes), [source, nodes]);
	const changed = source !== initialToml;
	const unsaved = changed && source !== exported;
	const blocker = useBlocker(
		({ currentLocation, nextLocation }) =>
			unsaved && currentLocation.pathname !== nextLocation.pathname,
	);
	const selectedNode = nodes.find((node) => node.symbolKey === selectedSymbolKey);

	useEffect(() => {
		if (blocker.state !== "blocked") return;
		if (window.confirm("These TOML changes have not been exported. Leave this page?"))
			blocker.proceed();
		else blocker.reset();
	}, [blocker]);
	useEffect(() => {
		if (!unsaved) return;
		const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", beforeUnload);
		return () => window.removeEventListener("beforeunload", beforeUnload);
	}, [unsaved]);

	useEffect(() => {
		if (!symbolFocus || symbolFocus.request === lastFocusRequest.current) return;
		lastFocusRequest.current = symbolFocus.request;
		setSelectedSymbolKey(symbolFocus.key);
		const reference =
			analysis.references.find(
				(candidate) => candidate.key === symbolFocus.key && candidate.path.startsWith("columns."),
			) ?? analysis.references.find((candidate) => candidate.key === symbolFocus.key);
		if (reference) editor.current?.focusAt(reference.from, reference.to);
	}, [analysis, symbolFocus]);

	function moveToFinding(direction: -1 | 1) {
		const selection = editor.current?.selectionRange() ?? { from: 0, to: 0 };
		const finding = adjacentFinding(
			[...analysis.todos, ...analysis.issues],
			selection.from,
			direction,
			selection.from === selection.to,
		);
		if (finding) editor.current?.focusAt(finding.from, finding.to);
	}

	function download() {
		const url = URL.createObjectURL(new Blob([source], { type: "application/toml;charset=utf-8" }));
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		link.click();
		window.setTimeout(() => URL.revokeObjectURL(url), 0);
		setExported(source);
		setMessage("Sidecar downloaded.");
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(source);
			setExported(source);
			setMessage("Sidecar copied.");
		} catch {
			setMessage("Copy failed. Select the text to copy it.");
		}
	}

	return (
		<section
			aria-label="Measurement sidecar editor"
			className="rounded-xl border border-border bg-surface"
		>
			<div className="space-y-2 border-b border-border px-5 py-4">
				<h2 className="font-semibold text-foreground">Measurement sidecar</h2>
				<p className="text-sm text-foreground-muted">
					Edit the TOML, then download it beside the CSV. Symbol keys link columns to this rig.
				</p>
			</div>
			<div className="space-y-4 p-5">
				{warnings.length > 0 ? (
					<div className="rounded-lg border border-warning-border bg-warning-surface p-3 text-sm text-warning-surface-foreground">
						<p className="font-semibold">Some diagram symbols need links before export.</p>
						<ul className="mt-2 list-disc space-y-1 pl-5">
							{warnings.map((warning) => (
								<li key={warning.nodeId}>{warning.message}</li>
							))}
						</ul>
					</div>
				) : null}
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => void copy()}
						className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-muted"
					>
						Copy
					</button>
					<button
						type="button"
						onClick={download}
						className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
					>
						Download TOML
					</button>
					<button
						type="button"
						disabled={!changed}
						onClick={() => {
							if (window.confirm("Replace your edits with the generated skeleton?"))
								setSource(initialToml);
						}}
						className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-muted disabled:opacity-50"
					>
						Reset
					</button>
					<button
						type="button"
						aria-label="Previous TODO or issue"
						onClick={() => moveToFinding(-1)}
						disabled={analysis.todos.length + analysis.issues.length === 0}
						className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted disabled:opacity-50"
					>
						Previous finding
					</button>
					<button
						type="button"
						aria-label="Next TODO or issue"
						onClick={() => moveToFinding(1)}
						disabled={analysis.todos.length + analysis.issues.length === 0}
						className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted disabled:opacity-50"
					>
						Next finding
					</button>
					<span role="status" className="text-sm text-foreground-muted">
						{message || (changed ? "Edited" : "Generated")} · {analysis.todos.length} TODOs ·{" "}
						{analysis.issues.length} issues
					</span>
				</div>
				{selectedNode ? (
					<p className="text-sm text-foreground-muted">
						Selected symbol: {selectedNode.label} ({selectedNode.symbolKey})
					</p>
				) : null}
				<div className="flex min-h-96 overflow-hidden rounded-lg border border-border">
					<SidecarTomlEditor
						ref={editor}
						value={source}
						nodes={nodes}
						selectedSymbolKey={selectedSymbolKey}
						onChange={(value) => {
							setSource(value);
							setMessage("");
						}}
						onSelectSymbol={(key) => {
							setSelectedSymbolKey(key);
							onSymbolSelectionChange?.(key);
						}}
					/>
				</div>
				{analysis.issues.length > 0 ? (
					<ul aria-label="TOML issues" className="space-y-1 text-sm text-danger">
						{analysis.issues.map((issue, index) => (
							<li key={`${issue.from}-${index}`}>
								<button
									type="button"
									className="text-left hover:underline"
									onClick={() => editor.current?.focusAt(issue.from, issue.to)}
								>
									Line {source.slice(0, issue.from).split("\n").length}: {issue.message}
								</button>
							</li>
						))}
					</ul>
				) : null}
			</div>
		</section>
	);
}
