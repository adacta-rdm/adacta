import { useDebounceCallback } from "@react-hook/debounce";
import { useCallback, useEffect, useState } from "react";
import type { Primitive } from "type-fest";

/**
 * Debounces the calls to the updaterFunction while instantly updating the (returned) value
 */
export function useDebounceFormUpdate<T extends Primitive | Primitive[]>(
	initialValue: T,
	updateFunction: (v: T) => void,
	delay: number
): [T, (e: T | ((e: T) => T)) => void] {
	const onChangeDebounced = useDebounceCallback(updateFunction, delay);

	const [value, setValue] = useState<T>(initialValue);

	const onChange = useCallback(
		() => (e: T | ((e: T) => T)) => {
			setValue(e);
			onChangeDebounced(typeof e === "function" ? e(value) : e);
		},
		[onChangeDebounced, value]
	);

	// Update the value if the initialValue changes (usually caused by the execution of
	// updaterFunction)
	useEffect(() => {
		setValue(initialValue);
	}, [initialValue, setValue]);

	return [value, onChange];
}
