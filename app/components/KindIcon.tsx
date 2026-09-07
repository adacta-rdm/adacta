/**
 * The icon standing for one kind of inventory entry.
 *
 * A rig is drawn as a group of parts, because it is built from components.
 * Standalone equipment is drawn as a single box.
 */
import { CubeIcon, RectangleGroupIcon } from "@heroicons/react/20/solid";

import type { Entity } from "~/drizzle/Schema.ts";

/**
 * Custom rigs carry a P&ID; standalone equipment does not.
 */
export type InventoryKind = Entity<"InventoryEntry">["kind"];

export function KindIcon({ kind, className }: { kind: InventoryKind; className?: string }) {
	const Icon = kind === "rig" ? RectangleGroupIcon : CubeIcon;

	/*
		The icons draw with fill="currentColor" and carry data-slot="icon". A
		caller that passes no class therefore takes the size and the color of its
		surroundings. The sidebar item sizes its icons that way.
	*/
	return <Icon className={className} />;
}
