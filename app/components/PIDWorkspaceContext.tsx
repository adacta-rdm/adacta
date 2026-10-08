import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";

import {
	readSidecarDraft,
	storeSidecarDraft,
	type SidecarDraft,
} from "~/app/lib/pidSidecarDraft.ts";

type PIDWorkspace = {
	selectedSymbolKey: string | null;
	setSelectedSymbolKey: (key: string | null) => void;
	symbolFocus: { key: string; request: number } | null;
	focusSymbol: (key: string | null) => void;
	csvFile: File | null;
	setCsvFile: (file: File | null) => void;
	drafts: Record<string, SidecarDraft>;
	setDraft: (
		rigSlug: string,
		initialToml: string,
		update: (draft: SidecarDraft) => SidecarDraft,
	) => void;
};

const Context = createContext<PIDWorkspace | null>(null);
export function PIDWorkspaceProvider({
	children,
	trigSlug: rigSlug,
	initialToml,
	onUnsavedChange,
}: PropsWithChildren<{
	trigSlug?: string;
	initialToml?: string;
	onUnsavedChange: (unsaved: boolean) => void;
}>) {
	const [selectedSymbolKey, setSelectedSymbolKey] = useState<string | null>(null);
	const [symbolFocus, setSymbolFocus] = useState<{ key: string; request: number } | null>(null);
	const [csvFile, setCsvFile] = useState<File | null>(null);
	const [drafts, setDrafts] = useState<Record<string, SidecarDraft>>({});
	const draft = rigSlug ? drafts[rigSlug] : undefined;
	const unsaved =
		draft !== undefined &&
		draft.initialToml === initialToml &&
		draft.source !== initialToml &&
		draft.source !== draft.exported;
	useEffect(() => onUnsavedChange(unsaved), [onUnsavedChange, unsaved]);

	useEffect(() => {
		setSelectedSymbolKey(null);
		setSymbolFocus(null);
		setCsvFile(null);
	}, [rigSlug]);

	useEffect(() => {
		if (!rigSlug || !initialToml) return;
		try {
			const stored = readSidecarDraft(window.sessionStorage, rigSlug, initialToml);
			if (stored)
				setDrafts((current) =>
					current[rigSlug]?.initialToml === initialToml
						? current
						: { ...current, [rigSlug]: stored },
				);
		} catch {
			// A disabled storage API must not prevent editing.
		}
	}, [rigSlug, initialToml]);

	useEffect(() => {
		if (!rigSlug || !draft || draft.initialToml !== initialToml) return;
		try {
			storeSidecarDraft(window.sessionStorage, rigSlug, draft);
		} catch {
			// The in-memory draft remains editable when storage is unavailable.
		}
	}, [rigSlug, initialToml, draft]);

	function focusSymbol(key: string | null) {
		setSelectedSymbolKey(key);
		if (key) setSymbolFocus((current) => ({ key, request: (current?.request ?? 0) + 1 }));
	}

	function setDraft(
		rigSlug: string,
		initialToml: string,
		update: (draft: SidecarDraft) => SidecarDraft,
	) {
		setDrafts((current) => ({
			...current,
			[rigSlug]: update(
				current[rigSlug]?.initialToml === initialToml
					? current[rigSlug]
					: { initialToml, source: initialToml, exported: null },
			),
		}));
	}

	return (
		<Context.Provider
			value={{
				selectedSymbolKey,
				setSelectedSymbolKey,
				symbolFocus,
				focusSymbol,
				csvFile,
				setCsvFile,
				drafts,
				setDraft,
			}}
		>
			{children}
		</Context.Provider>
	);
}

export function usePIDWorkspace() {
	const context = useContext(Context);
	if (!context) throw new Error("P&ID workspace is unavailable.");
	return context;
}
