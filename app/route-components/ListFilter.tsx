import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import { Form, useNavigation, useSubmit } from "react-router";

/**
 * Filters a list while preserving its selected view and record selections.
 */
export function ListFilter({
	id,
	label,
	placeholder,
	query,
	hiddenFields = {},
}: {
	id: string;
	label: string;
	placeholder: string;
	query: string;
	hiddenFields?: Record<string, string | string[]>;
}) {
	const navigation = useNavigation();
	const submit = useSubmit();
	const field = useRef<HTMLInputElement>(null);
	const searching = navigation.state !== "idle" && navigation.location?.search.includes("q=");

	// Browser history can change the query without changing the mounted input.
	useEffect(() => {
		if (field.current) field.current.value = query;
	}, [query]);

	return (
		<Form
			method="get"
			role="search"
			aria-label={label}
			className="relative"
			onChange={(event) => {
				void submit(event.currentTarget, { replace: query !== "", preventScrollReset: true });
			}}
		>
			{Object.entries(hiddenFields).flatMap(([name, values]) =>
				(Array.isArray(values) ? values : [values]).map((value) => (
					<input key={`${name}-${value}`} type="hidden" name={name} value={value} />
				)),
			)}
			<label htmlFor={id} className="sr-only">
				{label}
			</label>
			<span
				aria-hidden="true"
				className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
			>
				<MagnifyingGlassIcon
					className={clsx("size-5 text-foreground-muted", searching && "opacity-0")}
				/>
				<span
					className={clsx(
						"absolute inset-0 rounded-full border-2 border-border border-t-foreground opacity-0",
						searching && "animate-spin opacity-100 delay-300 motion-reduce:animate-none",
					)}
				/>
			</span>
			<input
				ref={field}
				id={id}
				name="q"
				type="text"
				defaultValue={query}
				placeholder={placeholder}
				className="w-full rounded-lg border border-border bg-surface py-2 pr-10 pl-10 text-sm text-foreground placeholder:text-foreground-muted focus:border-focus focus:outline-none"
			/>
			{query && (
				<button
					type="button"
					aria-label="Clear filter"
					onClick={(event) => {
						if (!field.current || !event.currentTarget.form) return;

						field.current.value = "";
						field.current.focus();
						void submit(event.currentTarget.form, { replace: true, preventScrollReset: true });
					}}
					className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
				>
					<XMarkIcon className="size-4" />
				</button>
			)}
		</Form>
	);
}
