/**
 * A gas bottle with a valve represents a rig. A bench analyzer represents a
 * standalone device. The cube represents components and other equipment.
 */
import { CubeIcon } from "@heroicons/react/20/solid";
import { useId } from "react";

/**
 * Custom rigs carry a P&ID; standalone equipment does not.
 */
export type InventoryKind = "rig" | "equipment";

const VALVE = "M7 8L13 12L7 16Z M19 8L13 12L19 16Z";

// The holes separate the display, the button, and the sample bay.
const DEVICE =
	"M4 3H16Q18 3 18 5V15Q18 16 17 16H3Q2 16 2 15V5Q2 3 4 3Z M5 6V10H11V6Z M13 6V8H15V6Z M5 12V14H15V12Z M5 16H6A1 1 0 0 1 7 17V17A1 1 0 0 1 6 18H5A1 1 0 0 1 4 17V17A1 1 0 0 1 5 16Z M14 16H15A1 1 0 0 1 16 17V17A1 1 0 0 1 15 18H14A1 1 0 0 1 13 17V17A1 1 0 0 1 14 16Z";

/**
 * Equipment uses the cube unless the caller knows that it is standalone.
 * For example, the inventory sidebar supplies this information, while the
 * equipment page header does not.
 */
export function KindIcon({
	kind,
	standalone = false,
	className,
}: {
	kind: InventoryKind;
	standalone?: boolean;
	className?: string;
}) {
	// Each rig copy needs its own mask, including copies in the page header.
	const maskId = useId();

	if (kind === "equipment" && !standalone) {
		return <CubeIcon className={className} />;
	}

	// The sidebar sizes and colors its icons through this data slot.
	return (
		<svg
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
			data-slot="icon"
			className={className}
		>
			{kind === "rig" ? (
				<>
					<defs>
						<mask
							id={maskId}
							maskUnits="userSpaceOnUse"
							x="0"
							y="0"
							width="20"
							height="20"
							style={{ maskType: "luminance" }}
						>
							<rect width="20" height="20" fill="white" />
							{/* The stroke removes one unit around the valve. */}
							<path d={VALVE} fill="black" stroke="black" strokeWidth="2" strokeLinejoin="round" />
						</mask>
					</defs>

					<g mask={`url(#${maskId})`}>
						<rect x="2" y="5" width="9" height="14" rx="3" />
						<rect x="5" y="2" width="3" height="4" rx="1" />
					</g>
					<path d={VALVE} />
				</>
			) : (
				<path fillRule="evenodd" d={DEVICE} />
			)}
		</svg>
	);
}
