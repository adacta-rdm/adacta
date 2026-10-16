import type { ReactNode } from "react";

import { Badge } from "~/catalyst-ui/badge.tsx";
import { Text } from "~/catalyst-ui/text.tsx";

/**
 * The stable identity shared by a catalog product and an inventory entry that
 * was created from it.
 */
export function ProductIdentity({
	title,
	manufacturerName,
	productNumber,
	subtitle,
	imageFileId,
	seriesName,
	origin,
}: {
	title: ReactNode;
	manufacturerName?: string;
	productNumber: string | null;
	subtitle: string | null;
	imageFileId: number | null;
	seriesName?: string;
	origin?: "catalog" | "user";
}) {
	return (
		<div className="flex flex-col gap-6 sm:flex-row">
			<div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-xl border border-border bg-surface">
				{imageFileId ? (
					<img
						src={`/files/originals/${imageFileId}`}
						alt=""
						className="max-h-full max-w-full object-contain p-4"
					/>
				) : (
					<span className="text-xs text-foreground-muted">No photograph available</span>
				)}
			</div>

			<div className="min-w-0">
				{title}
				<p className="mt-1 text-sm text-foreground-muted">
					{productNumber ?? "Model number not recorded"}
				</p>
				{manufacturerName ? (
					<p className="mt-2 text-sm text-foreground-muted">Manufacturer: {manufacturerName}</p>
				) : null}
				{subtitle ? <Text className="mt-3 max-w-2xl">{subtitle}</Text> : null}
				<div className="mt-3 flex flex-wrap gap-2">
					{seriesName ? <Badge>{seriesName}</Badge> : null}
					{origin === "user" ? (
						<span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-foreground-muted">
							User entered
						</span>
					) : null}
				</div>
			</div>
		</div>
	);
}
