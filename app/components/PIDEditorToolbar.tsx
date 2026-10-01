import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
	ArrowsRightLeftIcon,
	ArrowsUpDownIcon,
	ArrowUturnLeftIcon,
	ArrowUturnRightIcon,
	ChevronDownIcon,
	ClipboardDocumentIcon,
	ClipboardIcon,
	CursorArrowRaysIcon,
	DocumentDuplicateIcon,
	HandRaisedIcon,
	Squares2X2Icon,
} from "@heroicons/react/20/solid";
import { Panel as ReactFlowPanel } from "@xyflow/react";
import clsx from "clsx";
import type { ReactNode } from "react";

import type { PIDAlignment, PIDDistributionAxis } from "~/app/lib/PIDLayout.ts";

type EditorTool = "select" | "pan";

export interface PIDEditorToolbarProps {
	activeTool: EditorTool;
	setActiveTool: (tool: EditorTool) => void;
	canCopySelection: boolean;
	canPaste: boolean;
	duplicateSelection: () => void;
	copySelection: () => void;
	pasteClipboard: () => void;
	canAlignSelection: boolean;
	selectionCount: number;
	alignmentCollisions: Record<PIDAlignment, number>;
	alignmentChanges: Record<PIDAlignment, boolean>;
	alignSelectedNodes: (alignment: PIDAlignment) => void;
	canDistributeSelection: boolean;
	distributionCollisions: Record<PIDDistributionAxis, number>;
	distributionChanges: Record<PIDDistributionAxis, boolean>;
	distributeSelectedNodes: (axis: PIDDistributionAxis) => void;
	canUndo: boolean;
	canRedo: boolean;
	undo: () => void;
	redo: () => void;
}

type ToolbarButtonProps = {
	icon: ReactNode;
	label: string;
	title: string;
	onClick: () => void;
	disabled?: boolean;
	pressed?: boolean;
	ariaLabel?: string;
};

function ToolbarButton({
	icon,
	label,
	title,
	onClick,
	disabled = false,
	pressed,
	ariaLabel,
}: ToolbarButtonProps) {
	return (
		<button
			type="button"
			aria-label={ariaLabel ?? label}
			aria-pressed={pressed}
			title={title}
			disabled={disabled}
			className={clsx(
				TOOL_BUTTON_CLASS,
				pressed ? TOOL_BUTTON_ACTIVE_CLASS : TOOL_BUTTON_INACTIVE_CLASS,
			)}
			onClick={onClick}
		>
			{icon}
			{label}
		</button>
	);
}

function ToolbarGroup({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div
			role="group"
			aria-label={label}
			className="flex gap-1 border-l border-border pl-1 first:border-l-0 first:pl-0"
		>
			{children}
		</div>
	);
}

function ArrangeMenuItem({
	icon,
	label,
	title,
	disabled,
	onClick,
	ariaLabel,
}: ToolbarButtonProps & { ariaLabel?: string }) {
	return (
		<MenuItem disabled={disabled}>
			<button
				type="button"
				aria-label={ariaLabel ?? label}
				title={title}
				disabled={disabled}
				className={ARRANGE_MENU_ITEM_CLASS}
				onClick={onClick}
			>
				{icon}
				{label}
			</button>
		</MenuItem>
	);
}

export function PIDEditorToolbar({
	activeTool,
	setActiveTool,
	canCopySelection,
	canPaste,
	duplicateSelection,
	copySelection,
	pasteClipboard,
	canAlignSelection,
	selectionCount,
	alignmentCollisions,
	alignmentChanges,
	alignSelectedNodes,
	canDistributeSelection,
	distributionCollisions,
	distributionChanges,
	distributeSelectedNodes,
	canUndo,
	canRedo,
	undo,
	redo,
}: PIDEditorToolbarProps) {
	return (
		<ReactFlowPanel position="top-left" className="m-3">
			<div
				role="toolbar"
				aria-label="Diagram tools"
				className="flex w-max max-w-[calc(100vw-4rem)] flex-nowrap gap-1 rounded-lg border border-border bg-surface/95 p-1 shadow-lg backdrop-blur-sm max-lg:flex-wrap"
			>
				<ToolbarGroup label="Pointer tools">
					<ToolbarButton
						icon={<CursorArrowRaysIcon className="size-4" />}
						label="Select"
						title="Select"
						pressed={activeTool === "select"}
						onClick={() => setActiveTool("select")}
					/>
					<ToolbarButton
						icon={<HandRaisedIcon className="size-4" />}
						label="Hand"
						title="Pan canvas"
						pressed={activeTool === "pan"}
						onClick={() => setActiveTool("pan")}
					/>
				</ToolbarGroup>
				<ToolbarGroup label="Clipboard">
					<ToolbarButton
						icon={<DocumentDuplicateIcon className="size-4" />}
						label="Duplicate"
						ariaLabel="Duplicate selected symbols"
						title={
							canCopySelection
								? "Duplicate selected symbols (Ctrl/Cmd+D)"
								: "Duplicate selected symbols — select at least one symbol"
						}
						disabled={!canCopySelection}
						onClick={duplicateSelection}
					/>
					<ToolbarButton
						icon={<ClipboardDocumentIcon className="size-4" />}
						label="Copy"
						ariaLabel="Copy selected symbols"
						title={
							canCopySelection
								? "Copy selected symbols (Ctrl/Cmd+C)"
								: "Copy selected symbols — select at least one symbol"
						}
						disabled={!canCopySelection}
						onClick={copySelection}
					/>
					<ToolbarButton
						icon={<ClipboardIcon className="size-4" />}
						label="Paste"
						ariaLabel="Paste copied symbols"
						title={
							canPaste
								? "Paste copied symbols (Ctrl/Cmd+V)"
								: "Paste copied symbols — copy symbols first"
						}
						disabled={!canPaste}
						onClick={pasteClipboard}
					/>
				</ToolbarGroup>
				<Menu as="div" className="relative border-l border-border pl-1">
					<MenuButton className={clsx(TOOL_BUTTON_CLASS, TOOL_BUTTON_INACTIVE_CLASS)}>
						<Squares2X2Icon className="size-4" /> Arrange <ChevronDownIcon className="size-3.5" />
					</MenuButton>
					<MenuItems
						anchor="bottom start"
						transition
						className="z-30 mt-1 w-60 origin-top-left rounded-lg border border-border bg-surface p-1 shadow-lg transition duration-100 ease-out [--anchor-gap:0.25rem] focus:outline-none data-closed:scale-95 data-closed:opacity-0"
					>
						<div className="flex items-center justify-between px-2 py-1.5 text-[0.6875rem] font-semibold text-foreground-muted">
							<span>Align</span>
							<span>For 2+ symbols</span>
						</div>
						{(["left", "right", "top", "bottom"] as const).map((alignment) => {
							const label = layoutControlLabel(
								`Align selected symbols ${alignment}`,
								selectionCount,
								2,
								alignmentCollisions[alignment],
								alignmentChanges[alignment],
								`aligned ${alignment}`,
							);
							const disabled =
								!canAlignSelection ||
								alignmentCollisions[alignment] > 0 ||
								!alignmentChanges[alignment];
							return (
								<ArrangeMenuItem
									key={alignment}
									icon={<PIDAlignIcon alignment={alignment} />}
									label={`Align ${alignment}`}
									ariaLabel={label}
									title={label}
									disabled={disabled}
									onClick={() => alignSelectedNodes(alignment)}
								/>
							);
						})}
						<div className="mx-2 my-1 border-t border-border" />
						<div className="flex items-center justify-between px-2 py-1.5 text-[0.6875rem] font-semibold text-foreground-muted">
							<span>Distribute</span>
							<span>For 3+ symbols</span>
						</div>
						{(["horizontal", "vertical"] as const).map((axis) => {
							const label = layoutControlLabel(
								`Distribute selected symbols ${axis === "horizontal" ? "horizontally" : "vertically"}`,
								selectionCount,
								3,
								distributionCollisions[axis],
								distributionChanges[axis],
								`distributed ${axis === "horizontal" ? "horizontally" : "vertically"}`,
							);
							const disabled =
								!canDistributeSelection ||
								distributionCollisions[axis] > 0 ||
								!distributionChanges[axis];
							return (
								<ArrangeMenuItem
									key={axis}
									icon={
										axis === "horizontal" ? (
											<ArrowsRightLeftIcon className="size-4" />
										) : (
											<ArrowsUpDownIcon className="size-4" />
										)
									}
									label={`Distribute ${axis === "horizontal" ? "horizontally" : "vertically"}`}
									ariaLabel={label}
									title={label}
									disabled={disabled}
									onClick={() => distributeSelectedNodes(axis)}
								/>
							);
						})}
					</MenuItems>
				</Menu>
				<ToolbarGroup label="History">
					<ToolbarButton
						icon={<ArrowUturnLeftIcon className="size-4" />}
						label="Undo"
						title="Undo (Ctrl/Cmd+Z)"
						disabled={!canUndo}
						onClick={undo}
					/>
					<ToolbarButton
						icon={<ArrowUturnRightIcon className="size-4" />}
						label="Redo"
						title="Redo (Ctrl/Cmd+Shift+Z)"
						disabled={!canRedo}
						onClick={redo}
					/>
				</ToolbarGroup>
			</div>
		</ReactFlowPanel>
	);
}

function layoutControlLabel(
	action: string,
	selectionCount: number,
	minimumSelection: number,
	collisions: number,
	changesLayout: boolean,
	completedDescription: string,
) {
	if (selectionCount < minimumSelection)
		return `${action} — select at least ${minimumSelection} top-level nodes`;
	if (collisions > 0) return `${action} — unavailable because nodes would overlap or be too close`;
	if (!changesLayout) return `${action} — nodes are already ${completedDescription}`;
	return action;
}

function PIDAlignIcon({ alignment }: { alignment: PIDAlignment }) {
	if (alignment === "left" || alignment === "right") {
		const lineX = alignment === "left" ? 2.5 : 17.5;
		const starts = alignment === "left" ? [4.5, 4.5, 4.5] : [7, 10, 5];
		return (
			<svg viewBox="0 0 20 20" aria-hidden="true" className="size-4" fill="currentColor">
				<path d={`M${lineX} 2v16`} stroke="currentColor" strokeWidth="1.5" />
				<rect x={starts[0]} y="3.5" width="9" height="3" rx="0.75" />
				<rect x={starts[1]} y="8.5" width="6" height="3" rx="0.75" />
				<rect x={starts[2]} y="13.5" width="11" height="3" rx="0.75" />
			</svg>
		);
	}
	const lineY = alignment === "top" ? 2.5 : 17.5;
	const starts = alignment === "top" ? [4.5, 4.5, 4.5] : [7, 4, 9];
	return (
		<svg viewBox="0 0 20 20" aria-hidden="true" className="size-4" fill="currentColor">
			<path d={`M2 ${lineY}h16`} stroke="currentColor" strokeWidth="1.5" />
			<rect x="3.5" y={starts[0]} width="3" height="9" rx="0.75" />
			<rect x="8.5" y={starts[1]} width="3" height="12" rx="0.75" />
			<rect x="13.5" y={starts[2]} width="3" height="7" rx="0.75" />
		</svg>
	);
}

const TOOL_BUTTON_CLASS =
	"flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40";
const TOOL_BUTTON_ACTIVE_CLASS = "bg-accent text-accent-foreground";
const TOOL_BUTTON_INACTIVE_CLASS =
	"text-foreground-muted hover:bg-surface-muted hover:text-foreground disabled:hover:bg-transparent disabled:hover:text-foreground-muted";
const ARRANGE_MENU_ITEM_CLASS =
	"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground data-focus:bg-surface-muted focus:outline-none disabled:cursor-not-allowed disabled:text-foreground-muted disabled:opacity-50";
