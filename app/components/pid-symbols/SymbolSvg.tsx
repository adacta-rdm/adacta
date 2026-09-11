import type { ReactNode } from "react";

import type { PIDOrientation } from "~/app/lib/PID.ts";

export type { PIDOrientation } from "~/app/lib/PID.ts";

export interface PIDSymbolProps {
	orientation?: PIDOrientation;
	maximumSize?: number;
	className?: string;
}

interface SymbolSvgProps extends PIDSymbolProps {
	viewBox: readonly [x: number, y: number, width: number, height: number];
	bodySize?: number;
	children: ReactNode;
}

/**
 * Provides the common SVG surface, sizing, and rotation for one P&ID symbol.
 * Strokes may extend beyond the geometry box because SVG centers them on their
 * paths.
 */
export function SymbolSvg({
	viewBox: [x, y, width, height],
	bodySize,
	orientation = 0,
	maximumSize,
	className,
	children,
}: SymbolSvgProps) {
	const vertical = orientation % 2 === 1;
	const orientedWidth = vertical ? height : width;
	const orientedHeight = vertical ? width : height;
	const transforms = [
		undefined,
		`translate(${height} 0) rotate(90)`,
		`translate(${width} ${height}) rotate(180)`,
		`translate(0 ${width}) rotate(-90)`,
	] as const;
	const scale =
		maximumSize === undefined ? undefined : maximumSize / (bodySize ?? Math.max(width, height));
	const renderedSize =
		scale === undefined
			? undefined
			: {
					width: orientedWidth * scale,
					height: orientedHeight * scale,
				};
	const originTransform = x === 0 && y === 0 ? undefined : `translate(${-x} ${-y})`;

	return (
		<svg
			viewBox={`0 0 ${orientedWidth} ${orientedHeight}`}
			overflow="visible"
			aria-hidden="true"
			className={`block bg-diagram-surface ${className ?? ""}`}
			style={renderedSize}
		>
			<g transform={transforms[orientation]}>
				<g transform={originTransform}>{children}</g>
			</g>
		</svg>
	);
}
