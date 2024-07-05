import { EuiButton, EuiProgress } from "@elastic/eui";
import type { EuiButtonSize } from "@elastic/eui/src/components/button/button";
import type { PropsWithChildren } from "react";
import React from "react";

/**
 * Simple wrapper which integrates a progress bar at the top of the button
 */
export function ButtonWithProgress({
	children,
	progress,
	onClick,
	size,
	renderAsLink,
	disabled,
}: PropsWithChildren<{
	progress: number | undefined;
	onClick: () => void;
	size?: EuiButtonSize;
	renderAsLink?: boolean;
	disabled?: boolean;
}>) {
	if (renderAsLink) {
		return (
			<div key="open" style={{ position: "relative" }} onClick={disabled ? undefined : onClick}>
				<>{children}</>
				{progress !== undefined && (
					<EuiProgress size="xs" color="primary" value={progress} max={100} />
				)}
			</div>
		);
	}

	return (
		<div key="open" style={{ position: "relative" }}>
			<EuiButton
				isLoading={progress !== undefined}
				onClick={onClick}
				size={size}
				disabled={disabled}
			>
				{children}
			</EuiButton>
			{progress !== undefined && (
				<EuiProgress size="xs" color="primary" position="absolute" value={progress} max={100} />
			)}
		</div>
	);
}
