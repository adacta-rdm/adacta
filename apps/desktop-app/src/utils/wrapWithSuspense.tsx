import type { ComponentType } from "react";
import React, { forwardRef, Suspense } from "react";

/**
 * Wraps a component with a suspense boundary.
 * This function avoids having to manually create a new component just to wrap it with "Suspense".
 *
 * @param Component The component to wrap.
 * @param fallback The fallback component to display while the wrapped component is loading.
 */
export function wrapWithSuspense<TProps extends object>(
	Component: ComponentType<TProps>,
	fallback?: React.ReactNode
) {
	return forwardRef(function SuspenseWrapper(props: TProps, ref) {
		return (
			<Suspense fallback={fallback}>
				<Component {...props} ref={ref} />
			</Suspense>
		);
	});
}
