import React from "react";

/**
 * Renders a dot like Elastic Charts uses in the chart legend
 */
export function LegendDot(props: { color: string }) {
	const color = props.color;
	return (
		<div className="echLegendItem__color" title="series color">
			<svg width="16" height="16">
				<g
					transform="
          translate(8, 8)
          rotate(0)
        "
				>
					<path
						d="M -3.5 0 a 3.5,3.5 0 1,0 7,0 a 3.5,3.5 0 1,0 -7,0"
						stroke={color}
						strokeWidth="1"
						fill={color}
						opacity="1"
					/>
				</g>
			</svg>
		</div>
	);
}
