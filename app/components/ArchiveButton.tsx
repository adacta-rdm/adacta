import { ArchiveBoxArrowDownIcon, ArrowUturnLeftIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

/**
 * Uses the same labels, icons, and interaction states for table archive actions.
 */
export function ArchiveButton({
	operation,
	recordName,
	name,
	value,
	disabled = false,
	pending = false,
}: {
	operation: "archive" | "restore";
	recordName: string;
	name: string;
	value: string;
	disabled?: boolean;
	pending?: boolean;
}) {
	const restoring = operation === "restore";
	const label = restoring ? "Restore" : "Archive";
	const Icon = restoring ? ArrowUturnLeftIcon : ArchiveBoxArrowDownIcon;

	return (
		<button
			type="submit"
			name={name}
			value={value}
			disabled={disabled || pending}
			aria-label={`${label} ${recordName}`}
			aria-busy={pending}
			className={clsx(
				"inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm whitespace-nowrap text-foreground-muted focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50",
				restoring
					? "hover:bg-canvas-sunken hover:text-foreground"
					: "hover:bg-danger-surface hover:text-danger-surface-foreground",
			)}
		>
			<Icon aria-hidden="true" className="size-4 shrink-0" />
			{pending ? (restoring ? "Restoring…" : "Archiving…") : label}
		</button>
	);
}
