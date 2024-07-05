import { useDebounceCallback } from "@react-hook/debounce";
import { useEffect, useState } from "react";

/**
 * Debounces the calls to the updaterFunction while instantly updating the (returned) value
 */
export function useDebounceFormUpdate<T>(
	initialValue: T,
	updateFunction: (v: T) => void,
	delay: number
): [T, (e: T) => void] {
	const onChangeDebounced = useDebounceCallback(updateFunction, delay);

	const onChange = (e: T) => {
		setValue(e);
		onChangeDebounced(e);
	};

	const [value, setValue] = useState<T>(initialValue);

	// Update the value if the initialValue changes (usually caused by the execution of
	// updaterFunction)
	useEffect(() => {
		setValue(initialValue);
	}, [initialValue, setValue]);

	return [value, onChange];
}
