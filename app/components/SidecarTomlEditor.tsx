import { autocompletion } from "@codemirror/autocomplete";
import { StreamLanguage } from "@codemirror/language";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import { linter } from "@codemirror/lint";
import { Compartment, EditorState } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import type { SidecarEditorNode } from "~/app/lib/sidecarEditor.ts";
import { analyzeTomlSidecar } from "~/app/lib/sidecarTomlEditor.ts";

export type SidecarTomlEditorHandle = {
	focusAt: (offset: number, end?: number, highlightLine?: boolean) => void;
	selectionRange: () => { from: number; to: number };
};

export const SidecarTomlEditor = forwardRef<
	SidecarTomlEditorHandle,
	{
		value: string;
		nodes: SidecarEditorNode[];
		selectedSymbolKey: string | null;
		onChange: (value: string) => void;
		onSelectSymbol: (key: string | null) => void;
		onJumpClear: () => void;
		jumpMarkerActive: boolean;
	}
>(function SidecarTomlEditor(
	{ value, nodes, selectedSymbolKey, onChange, onSelectSymbol, onJumpClear, jumpMarkerActive },
	ref,
) {
	const container = useRef<HTMLDivElement>(null);
	const view = useRef<EditorView>(null);
	const callbacks = useRef({ onChange, onSelectSymbol, onJumpClear });
	const linkedNodes = useRef(nodes);
	const highlight = useRef(new Compartment());
	const jumpHighlight = useRef(new Compartment());
	const jumpActive = useRef(false);
	const jumpSelection = useRef<{ from: number; to: number } | null>(null);
	const initialValue = useRef(value);

	useEffect(() => {
		callbacks.current = { onChange, onSelectSymbol, onJumpClear };
	}, [onChange, onSelectSymbol, onJumpClear]);

	useEffect(() => {
		linkedNodes.current = nodes;
	}, [nodes]);

	useImperativeHandle(
		ref,
		() => ({
			focusAt(offset, end = offset, highlightLine = false) {
				const editor = view.current;
				if (!editor) return;
				const length = editor.state.doc.length;
				const from = Math.min(Math.max(offset, 0), length);
				const to = Math.min(Math.max(end, from), length);
				if (!highlightLine && jumpActive.current) {
					jumpActive.current = false;
					jumpSelection.current = null;
					editor.dispatch({
						effects: jumpHighlight.current.reconfigure(EditorView.decorations.of(Decoration.none)),
					});
				}
				const jumpEffects = highlightLine
					? [
							jumpHighlight.current.reconfigure(
								EditorView.decorations.of(
									Decoration.set([
										Decoration.line({ class: "cm-sidecar-jump" }).range(
											editor.state.doc.lineAt(from).from,
										),
									]),
								),
							),
							EditorView.scrollIntoView(from, { y: "center" }),
						]
					: [];
				if (highlightLine) {
					jumpActive.current = true;
					jumpSelection.current = { from, to };
				}
				editor.dispatch({
					selection: { anchor: from, head: to },
					scrollIntoView: !highlightLine,
					effects: jumpEffects,
				});
				editor.focus();
				if (highlightLine) editor.dom.scrollIntoView({ block: "center", inline: "nearest" });
			},
			selectionRange() {
				const selection = view.current?.state.selection.main;
				return { from: selection?.from ?? 0, to: selection?.to ?? 0 };
			},
		}),
		[],
	);

	useEffect(() => {
		if (!container.current) return;
		const editor = new EditorView({
			parent: container.current,
			state: EditorState.create({
				doc: initialValue.current,
				extensions: [
					basicSetup,
					StreamLanguage.define(toml),
					EditorView.lineWrapping,
					EditorView.theme({
						"&": {
							height: "100%",
							backgroundColor: "var(--color-surface)",
							color: "var(--color-foreground)",
							fontSize: "13px",
						},
						".cm-scroller": {
							overflow: "auto",
							fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
							lineHeight: "1.55",
						},
						".cm-content": { padding: "14px 0", caretColor: "var(--color-accent)" },
						".cm-gutters": {
							backgroundColor: "var(--color-surface-muted)",
							color: "var(--color-foreground-muted)",
							borderRight: "1px solid var(--color-border)",
						},
						".cm-activeLine, .cm-activeLineGutter": {
							backgroundColor: "var(--color-surface-muted)",
						},
						".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
							backgroundColor: "var(--color-info-surface)",
						},
						".cm-sidecar-reference": {
							backgroundColor: "var(--color-info-surface)",
							outline: "1px solid var(--color-accent)",
							borderRadius: "2px",
						},
						".cm-sidecar-jump, .cm-sidecar-jump.cm-activeLine": {
							backgroundColor: "var(--color-info-surface)",
							boxShadow: "inset 3px 0 var(--color-accent)",
						},
						"&.cm-focused": { outline: "2px solid var(--color-focus)", outlineOffset: "-2px" },
					}),
					linter(
						(view) =>
							analyzeTomlSidecar(view.state.doc.toString(), linkedNodes.current).issues.map(
								(issue) => ({
									from: Math.min(issue.from, view.state.doc.length),
									to: Math.min(Math.max(issue.to, issue.from + 1), view.state.doc.length),
									severity: "error" as const,
									message: issue.message,
								}),
							),
						{ delay: 300 },
					),
					autocompletion({
						override: [
							(context) => {
								const result = analyzeTomlSidecar(
									context.state.doc.toString(),
									linkedNodes.current,
								).suggestions(context.pos);
								return result && result.options.length
									? { ...result, filter: result.filter ?? !context.explicit }
									: null;
							},
						],
					}),
					highlight.current.of([]),
					jumpHighlight.current.of([]),
					EditorView.updateListener.of((update) => {
						if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
						if (update.selectionSet && jumpActive.current) {
							const selection = update.state.selection.main;
							const target = jumpSelection.current;
							if (target && selection.from === target.from && selection.to === target.to) {
								jumpSelection.current = null;
							} else if (!target) {
								jumpActive.current = false;
								callbacks.current.onJumpClear();
							}
						}
						if (update.selectionSet || update.docChanged) {
							const model = analyzeTomlSidecar(update.state.doc.toString(), linkedNodes.current);
							const offset = update.state.selection.main.head;
							const context = model.contextAt(offset);
							const prefix = context?.path.match(/^(columns\.\d+|experiment\.samples\.\d+)/)?.[1];
							const reference =
								model.references.find(
									(candidate) => candidate.from <= offset && offset <= candidate.to,
								) ??
								model.references.find(
									(candidate) => prefix && candidate.path === `${prefix}.symbol_key`,
								);
							callbacks.current.onSelectSymbol(reference?.key ?? null);
						}
					}),
				],
			}),
		});
		view.current = editor;
		return () => {
			editor.destroy();
			view.current = null;
		};
	}, []);

	useEffect(() => {
		const editor = view.current;
		if (!editor) return;
		if (!jumpMarkerActive && jumpActive.current) {
			jumpActive.current = false;
			jumpSelection.current = null;
			editor.dispatch({
				effects: jumpHighlight.current.reconfigure(EditorView.decorations.of(Decoration.none)),
			});
		}
	}, [jumpMarkerActive]);

	useEffect(() => {
		const editor = view.current;
		if (!editor) return;
		if (editor.state.doc.toString() !== value)
			editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
		if (!jumpActive.current) return;
		jumpActive.current = false;
		jumpSelection.current = null;
		editor.dispatch({
			effects: jumpHighlight.current.reconfigure(EditorView.decorations.of(Decoration.none)),
		});
	}, [value]);

	useEffect(() => {
		const editor = view.current;
		if (!editor) return;
		const references = analyzeTomlSidecar(editor.state.doc.toString(), nodes).references;
		const marks = selectedSymbolKey
			? references
					.filter(
						(reference) => reference.key === selectedSymbolKey && reference.to > reference.from,
					)
					.map((reference) =>
						Decoration.mark({ class: "cm-sidecar-reference" }).range(reference.from, reference.to),
					)
			: [];
		editor.dispatch({
			effects: highlight.current.reconfigure(EditorView.decorations.of(Decoration.set(marks))),
		});
	}, [value, nodes, selectedSymbolKey]);

	return (
		<div
			ref={container}
			aria-label="Editable TOML sidecar"
			className="sidecar-editor min-h-0 min-w-0 flex-1 overflow-hidden"
		/>
	);
});
