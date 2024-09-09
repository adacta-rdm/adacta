import type { ComponentType } from "react";
import React, { forwardRef, Suspense } from "react";

/**
 * Wraps a component with a suspense boundary.
 * This function avoids having to manually create a new component just to wrap it with "Suspense".
 *
 * @param Component The component to wrap.
 * @param Fallback
 */
export function wrapWithSuspense<TProps extends object>(
	Component: ComponentType<TProps>,
	Fallback?: (props: TProps) => React.ReactNode
) {
	return forwardRef(function SuspenseWrapper(props: TProps, ref) {
		return (
			<Suspense fallback={Fallback ? <Fallback {...props} /> : null}>
				<Component {...props} ref={ref} />
			</Suspense>
		);
	});
}
