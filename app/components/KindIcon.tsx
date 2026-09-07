/**
 * The icon standing for one kind of inventory entry.
 *
 * Standalone equipment is drawn as a single cube. A rig is drawn as the
 * same cube with a P&ID valve at the top left. A line runs from the valve
 * into the cube, and an arrow leaves the cube at the right. The valve
 * says that the entry carries a process diagram. The line and the arrow
 * say that something flows through the assembly.
 */
import { CubeIcon } from "@heroicons/react/20/solid";
import { useId } from "react";

import type { Entity } from "~/drizzle/Schema.ts";

/**
 * Custom rigs carry a P&ID; standalone equipment does not.
 */
export type InventoryKind = Entity<"InventoryEntry">["kind"];

export function KindIcon({ kind, className }: { kind: InventoryKind; className?: string }) {
	/*
		Both icons draw with fill="currentColor" and carry data-slot="icon". A
		caller that passes no class therefore takes the size and the color of its
		surroundings. The sidebar item sizes its icons that way.
	*/
	if (kind === "rig") {
		return <RigIcon className={className} />;
	}

	return <CubeIcon className={className} />;
}

// Valve, lines, and arrowhead share one line width. The gap that separates
// them from the cube is the same width as the gap between the cube faces.
const LINE_WIDTH = 0.8;
const GAP = 0.6;

// Two triangles tip to tip, the P&ID symbol for a valve.
const VALVE = "M0.5 0.5L4.5 3.25L0.5 6ZM8.5 0.5L4.5 3.25L8.5 6Z";

// From the right tip of the valve, right, then down into the top face.
const INLET = "M8.5 3.25H12.3A1.2 1.2 0 0 1 13.5 4.45V6.5";

// Starts inside the right face, so the gap shows it leaving the cube.
const OUTLET = "M14.5 13.5H17.6";
const ARROWHEAD = "M17.3 12.06L19.7 13.5L17.3 14.94Z";

// Top, right, and left face of the cube, each inset by half the face gap.
const CUBE =
	"M9.25 4.6L15.656 7.648L9.25 10.845L2.844 7.648Z" +
	"M9.55 11.366L16 8.147L16 15.371L9.55 18.839Z" +
	"M2.5 8.147L8.95 11.366L8.95 18.839L2.5 15.371Z";

function RigIcon({ className }: { className?: string }) {
	// The sidebar draws this icon once per rig. Each copy needs its own mask
	// id, or every copy would reference the first one.
	const maskId = useId();

	return (
		<svg
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
			data-slot="icon"
			className={className}
		>
			{/* Black areas of the mask are cut out of the cube. */}
			<mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
				<rect width="20" height="20" fill="#fff" />
				<path
					d={VALVE}
					fill="none"
					stroke="#000"
					strokeWidth={LINE_WIDTH + 2 * GAP}
					strokeLinejoin="round"
				/>
				<path
					d={OUTLET}
					fill="none"
					stroke="#000"
					strokeWidth={LINE_WIDTH + 2 * GAP}
					strokeLinecap="round"
				/>
				<path
					d={ARROWHEAD}
					fill="#000"
					stroke="#000"
					strokeWidth={2 * GAP}
					strokeLinejoin="round"
				/>
			</mask>

			<path mask={`url(#${maskId})`} d={CUBE} />

			<path
				d={VALVE}
				fill="none"
				stroke="currentColor"
				strokeWidth={LINE_WIDTH}
				strokeLinejoin="round"
			/>

			<path
				d={INLET}
				fill="none"
				stroke="currentColor"
				strokeWidth={LINE_WIDTH}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>

			<path
				d={OUTLET}
				fill="none"
				stroke="currentColor"
				strokeWidth={LINE_WIDTH}
				strokeLinecap="round"
			/>
			<path d={ARROWHEAD} />
		</svg>
	);
}
