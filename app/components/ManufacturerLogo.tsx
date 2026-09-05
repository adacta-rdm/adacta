/**
 * The mark shown for a manufacturer.
 *
 * Two of the thirteen seeded manufacturers supply a logo. The rest show the
 * first letter of their name, so a list of them still reads as a list of
 * marks.
 */
export function ManufacturerLogo({
	name,
	logoPath,
	className = "size-16",
}: {
	name: string;
	logoPath: string | null;
	className?: string;
}) {
	return (
		<div
			className={`flex shrink-0 items-center justify-center rounded-lg border border-border bg-surface p-2 ${className}`}
		>
			{logoPath ? (
				<img src={logoPath} alt="" className="max-h-full max-w-full object-contain" />
			) : (
				<span className="text-2xl font-semibold text-foreground-muted">
					{name.slice(0, 1).toUpperCase()}
				</span>
			)}
		</div>
	);
}
