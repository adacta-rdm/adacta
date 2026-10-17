/**
 * A user selection loads its options from /api/users when the field or its
 * button is first focused.
 */
import {
	Combobox,
	ComboboxButton,
	ComboboxInput,
	ComboboxOption,
	ComboboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { useId, useRef, useState } from "react";

export interface UserOption {
	id: string;
	name: string;
}

export function UserSelect({
	name,
	required = false,
	defaultValue,
	emptyLabel,
	excludeUserId,
	form,
	"aria-invalid": invalid,
	"aria-describedby": describedBy,
}: {
	name: string;
	required?: boolean;
	defaultValue?: UserOption;
	emptyLabel?: string;
	excludeUserId?: string;
	form?: string;
	"aria-invalid"?: boolean;
	"aria-describedby"?: string;
}) {
	const [selected, setSelected] = useState<UserOption | null>(defaultValue ?? null);
	const [users, setUsers] = useState<UserOption[]>([]);
	const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
	const [query, setQuery] = useState("");
	const requested = useRef(false);
	const statusId = useId();
	const emptyOption = { id: "", name: emptyLabel ?? "" };

	async function loadUsers() {
		// Focus and the open button can run before React renders the loading state.
		if (requested.current) return;
		requested.current = true;
		setStatus("loading");

		try {
			const response = await fetch("/api/users");
			if (!response.ok) throw new Error("Could not load users.");

			const result: { users: UserOption[] } = await response.json();
			setUsers(result.users);
			setStatus("loaded");
		} catch {
			requested.current = false;
			setStatus("error");
		}
	}

	// The starting name remains available while the options are loading or unavailable.
	const available = status === "loaded" ? users : defaultValue ? [defaultValue] : [];
	const options = [
		...(!required && emptyLabel ? [emptyOption] : []),
		...available.filter((user) => user.id !== excludeUserId),
	].filter((user) => user.name.toLowerCase().includes(query.toLowerCase()));
	const description =
		[describedBy, status !== "idle" && status !== "loaded" ? statusId : null]
			.filter(Boolean)
			.join(" ") || undefined;

	return (
		<div>
			<input type="hidden" name={name} form={form} value={selected?.id ?? ""} />
			<Combobox
				value={selected ?? (emptyLabel ? emptyOption : null)}
				by="id"
				onChange={setSelected}
				onClose={() => setQuery("")}
			>
				<div className="relative">
					<ComboboxInput
						aria-invalid={invalid}
						aria-describedby={description}
						aria-busy={status === "loading"}
						required={required}
						form={form}
						displayValue={(user: UserOption | null) => user?.name ?? ""}
						onFocus={loadUsers}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search users"
						className="block w-full rounded-lg border border-border bg-surface py-2 pr-10 pl-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-focus focus:outline-none aria-invalid:border-danger"
					/>
					<ComboboxButton
						aria-label="Show users"
						onFocus={loadUsers}
						onClick={loadUsers}
						className="absolute inset-y-0 right-0 flex items-center px-2 text-foreground-muted"
					>
						<ChevronUpDownIcon aria-hidden="true" className="size-4" />
					</ComboboxButton>
				</div>
				<ComboboxOptions
					anchor="bottom start"
					className="z-50 max-h-60 min-w-(--input-width) overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg [--anchor-gap:--spacing(2)] empty:invisible"
				>
					{options.map((user) => (
						<ComboboxOption
							key={user.id}
							value={user}
							className="group flex cursor-default items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-foreground select-none data-focus:bg-accent data-focus:text-accent-foreground"
						>
							{user.name}
							<CheckIcon
								aria-hidden="true"
								className="invisible size-4 group-data-selected:visible"
							/>
						</ComboboxOption>
					))}
				</ComboboxOptions>
			</Combobox>
			{status === "loading" ? (
				<p id={statusId} role="status" className="mt-2 text-sm text-foreground-muted">
					Loading users…
				</p>
			) : status === "error" ? (
				<p id={statusId} role="alert" className="mt-2 text-sm text-danger">
					Could not load users. The current selection is still available.
				</p>
			) : null}
		</div>
	);
}
