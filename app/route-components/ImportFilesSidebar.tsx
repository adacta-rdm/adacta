import { DocumentTextIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { createContext, useContext, type ReactNode } from "react";
import { Link } from "react-router";

import { SidebarSection } from "~/catalyst-ui/sidebar.tsx";

type ImportFileSelection = {
	files: File[];
	activeFile?: File;
	isUploading: boolean;
	onSelectFile: (file: File) => void;
	onRemoveFile: (file: File) => void;
};

const ImportFileSelectionContext = createContext<ImportFileSelection | null>(null);

export function ImportFileSelectionProvider({
	value,
	children,
}: {
	value: ImportFileSelection;
	children: ReactNode;
}) {
	return <ImportFileSelectionContext value={value}>{children}</ImportFileSelectionContext>;
}

export function SelectedFilesSidebar() {
	const selection = useContext(ImportFileSelectionContext);
	if (!selection) return null;
	const { files, activeFile, isUploading, onSelectFile, onRemoveFile } = selection;

	return (
		<SidebarSection>
			<p className="px-2 text-xs font-medium text-foreground-muted">Files to upload</p>
			{files.length === 0 ? (
				<p className="px-2 py-2 text-sm text-foreground-muted">No files selected.</p>
			) : (
				<ul aria-label="Files to upload" className="space-y-1">
					{files.map((file) => (
						<li
							key={`${file.name}\u0000${file.size}\u0000${file.lastModified}\u0000${file.type}`}
							className="flex items-center gap-1"
						>
							<button
								type="button"
								aria-current={file === activeFile ? "true" : undefined}
								className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus ${file === activeFile ? "bg-surface-muted" : ""}`}
								onClick={() => onSelectFile(file)}
							>
								<DocumentTextIcon className="size-4 shrink-0 text-foreground-muted" />
								<span className="min-w-0">
									<span className="block truncate text-foreground" title={file.name}>
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
								className="rounded-lg p-2 text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
								onClick={() => onRemoveFile(file)}
							>
								<XMarkIcon className="size-4" />
							</button>
						</li>
					))}
				</ul>
			)}
		</SidebarSection>
	);
}

export function UploadedFilesSidebar({
	files,
}: {
	files: { name: string; href: string; current: boolean }[];
}) {
	return (
		<SidebarSection>
			<p className="px-2 text-xs font-medium text-foreground-muted">Uploaded files</p>
			<ul aria-label="Uploaded files" className="space-y-1">
				{files.map((file) => (
					<li key={file.href}>
						<Link
							to={file.href}
							preventScrollReset
							aria-current={file.current ? "page" : undefined}
							className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus ${file.current ? "bg-surface-muted" : ""}`}
						>
							<DocumentTextIcon className="size-4 shrink-0 text-foreground-muted" />
							<span className="truncate" title={file.name}>
								{file.name}
							</span>
						</Link>
					</li>
				))}
			</ul>
		</SidebarSection>
	);
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} ${bytes === 1 ? "byte" : "bytes"}`;
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
