/**
 * The mark shown for a manufacturer.
 *
 * A manufacturer without a logo shows the first letter of its name.
 */
export function ManufacturerLogo({
	name,
	logoUrl,
	className = "size-16",
}: {
	name: string;
	logoUrl: string | null;
	className?: string;
}) {
	return (
		<div
			className={`flex shrink-0 items-center justify-center rounded-lg border border-border bg-surface p-2 ${className}`}
		>
			{logoUrl ? (
				<img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" />
			) : (
				<span className="text-2xl font-semibold text-foreground-muted">
					{name.slice(0, 1).toUpperCase()}
				</span>
			)}
		</div>
	);
}
