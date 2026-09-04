import { useRef, useState, type DragEvent, type ReactNode } from "react";

export function RepositoryFileDropTarget({
	children,
	onDropFiles,
}: {
	children: ReactNode;
	onDropFiles: (files: File[]) => void;
}) {
	const dragDepth = useRef(0);
	const [isDraggingFiles, setIsDraggingFiles] = useState(false);

	function containsFiles(event: DragEvent<HTMLElement>) {
		return event.dataTransfer.types.includes("Files");
	}

	function handleDragEnter(event: DragEvent<HTMLElement>) {
		if (!containsFiles(event)) return;

		event.preventDefault();
		dragDepth.current += 1;
		setIsDraggingFiles(true);
	}

	function handleDragOver(event: DragEvent<HTMLElement>) {
		if (!containsFiles(event)) return;

		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
	}

	function handleDragLeave(event: DragEvent<HTMLElement>) {
		if (!containsFiles(event)) return;

		dragDepth.current = Math.max(0, dragDepth.current - 1);
		if (dragDepth.current === 0) setIsDraggingFiles(false);
	}

	function handleDrop(event: DragEvent<HTMLElement>) {
		if (!containsFiles(event)) return;

		event.preventDefault();
		dragDepth.current = 0;
		setIsDraggingFiles(false);

		const files = [...event.dataTransfer.files];
		if (files.length > 0) onDropFiles(files);
	}

	return (
		<div
			className={isDraggingFiles ? "cursor-copy" : undefined}
			onDragEnter={handleDragEnter}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{children}

			{isDraggingFiles ? (
				<div
					role="status"
					className="pointer-events-none fixed inset-4 z-50 grid place-items-center rounded-xl border-2 border-dashed border-accent bg-canvas/90 text-foreground shadow-lg backdrop-blur-sm"
				>
					<p className="text-lg font-semibold">Drop files to import</p>
				</div>
			) : null}
		</div>
	);
}
