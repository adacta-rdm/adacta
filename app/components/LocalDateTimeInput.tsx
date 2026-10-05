import { useEffect, useRef, type ChangeEvent } from "react";

/**
 * A local clock field that submits an unambiguous moment.
 *
 * The hidden input keeps the original moment during the server render. The
 * browser fills the visible field in its own time zone after the page loads.
 */
export function LocalDateTimeInput({
	id,
	name,
	value,
	invalid,
	describedBy,
}: {
	id: string;
	name: string;
	value: Date;
	invalid?: boolean;
	describedBy?: string;
}) {
	const visible = useRef<HTMLInputElement>(null);
	const hidden = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (visible.current) visible.current.value = localDateTimeValue(value);
	}, [value]);

	function updateMoment(event: ChangeEvent<HTMLInputElement>) {
		if (!hidden.current) return;

		const moment = new Date(event.currentTarget.value);
		hidden.current.value = Number.isNaN(moment.valueOf()) ? "" : moment.toISOString();
	}

	return (
		<>
			<input ref={hidden} type="hidden" name={name} defaultValue={value.toISOString()} />
			<input
				ref={visible}
				id={id}
				type="datetime-local"
				step="1"
				required
				onChange={updateMoment}
				aria-invalid={invalid || undefined}
				aria-describedby={describedBy}
				className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-focus focus:outline-none"
			/>
		</>
	);
}

function localDateTimeValue(value: Date): string {
	const offset = value.getTimezoneOffset() * 60_000;
	return new Date(value.getTime() - offset).toISOString().slice(0, 19);
}
