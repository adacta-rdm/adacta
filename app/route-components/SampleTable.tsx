import { PlusIcon, TrashIcon } from "@heroicons/react/20/solid";
import type { ReactNode } from "react";
import { Form, useNavigation } from "react-router";

import { formatCalendarDate } from "~/app/lib/dates.ts";
import { nextSampleName } from "~/app/lib/sampleNames.ts";
import type { SampleErrors } from "~/app/lib/sampleSubmission.ts";

export interface SampleRow {
	id: number;
	name: string;
	preparedBy?: { name: string } | undefined;
	metadataArchivedAt: Date | null;
}

export interface SampleBatchRow {
	name: string;
	preparationDate: string;
	preparedById: string;
	preparedBy?: { name: string } | undefined;
}

/**
 * Where the sample rows put their values in the table that holds them.
 *
 * The batch page has a table of its own with four columns. The batch list
 * shows the same rows inside its own table, which has six columns, or seven
 * on the archived tab. Naming the column of each value keeps a sample below
 * the heading it belongs to. For example, the preparer of a sample sits under
 * "Prepared by" on both pages.
 *
 * A column that has no counterpart is left empty. For example, a sample has no
 * composition of its own, so that cell stays blank.
 */
export interface SampleColumns {
	total: number;
	label: number;
	preparedBy: number;
	preparedOn: number;
	actions: number;
}

const CELL = "py-3 pr-4 align-middle text-foreground-muted";
const ACTION_CELL = "py-3 pr-5 text-left";

/**
 * Lay the given values out over the columns of the table. Every column gets a
 * cell, so a sample row lines up with the batch row above it. A column with no
 * value is left empty.
 */
function cells(
	columns: SampleColumns,
	labelClass: string,
	filled: Record<number, ReactNode>,
): ReactNode[] {
	return Array.from({ length: columns.total }, (_, index) => {
		if (index === columns.label) {
			return (
				<th key={index} scope="row" className={labelClass}>
					{filled[index] ?? null}
				</th>
			);
		}

		return (
			<td key={index} className={index === columns.actions ? ACTION_CELL : CELL}>
				{filled[index] ?? null}
			</td>
		);
	});
}

/**
 * The samples of one batch, as rows of the table that holds them.
 *
 * Two pages show these rows. The batch page posts to itself. The batch list
 * shows them inside the open row and posts to the list, so a rejected label is
 * reported in the row the person is looking at. The receiving page says what
 * it needs through hiddenFields.
 *
 * An archived batch is read only. The add row and the delete buttons are then
 * left out.
 */
export function SampleRows({
	batch,
	batchSlug,
	samples,
	preparers,
	columns,
	archived = false,
	indent = false,
	errors,
	hiddenFields,
	preventScrollReset = false,
}: {
	batch: SampleBatchRow;

	/** Makes the form and error ids of this batch unique on the page. */
	batchSlug: string;
	samples: readonly SampleRow[];
	preparers: readonly { id: string; name: string }[];
	columns: SampleColumns;
	archived?: boolean;

	/** Step the label in, so a sample reads as belonging to the batch above. */
	indent?: boolean;
	errors?: SampleErrors | undefined;

	/** Sent with every form, so the receiving page knows which batch this is. */
	hiddenFields?: Record<string, string>;

	/** Keep the page where it is when a form is submitted from a long list. */
	preventScrollReset?: boolean;
}) {
	const visible = samples.filter((sample) => !sample.metadataArchivedAt);

	// An archived sample keeps its label. The next free label skips it.
	const suggestedName = nextSampleName(samples.map((sample) => sample.name));

	const formId = `add-sample-${batchSlug}`;
	const errorId = `${formId}-error`;
	const preparerErrorId = `${formId}-preparer-error`;

	const sampleError = errors?.name ?? errors?.form;
	const preparerError = errors?.preparedById;

	const navigation = useNavigation();
	// Busy until the new page data has arrived, not only while the action runs.
	const submitted = navigation.formData;
	const isSubmitting = submitted !== undefined;
	const isAdding = submitted?.has("add") ?? false;
	const deletingSampleId = submitted?.get("delete");

	const labelCell = `py-3 pr-4 font-normal text-foreground ${indent ? "pl-10" : "pl-5"}`;

	const hidden = Object.entries(hiddenFields ?? {}).map(([name, value]) => (
		<input key={name} type="hidden" name={name} value={value} />
	));

	if (visible.length === 0 && archived) {
		return (
			<tr>
				<td colSpan={columns.total} className={`${CELL} ${indent ? "pl-10" : "pl-5"}`}>
					This batch holds no samples.
				</td>
			</tr>
		);
	}

	return (
		<>
			{visible.map((sample) => (
				<tr key={sample.id}>
					{cells(columns, labelCell, {
						[columns.label]: (
							<span className="rounded bg-surface-muted px-1.5 py-0.5 font-semibold">
								{sample.name}
							</span>
						),
						[columns.preparedBy]: sample.preparedBy?.name ?? "Unknown",

						// A sample is a portion of the batch. It was prepared on the day the
						// batch material was prepared.
						[columns.preparedOn]: (
							<time dateTime={batch.preparationDate}>
								{formatCalendarDate(batch.preparationDate)}
							</time>
						),
						[columns.actions]: archived ? null : (
							<Form method="post" preventScrollReset={preventScrollReset}>
								{hidden}
								<button
									type="submit"
									name="delete"
									value={sample.id}
									disabled={isSubmitting}
									aria-label={`Delete ${batch.name} ${sample.name}`}
									className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-foreground-muted hover:bg-danger-surface hover:text-danger-surface-foreground focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
								>
									<TrashIcon className="size-4" />
									{deletingSampleId === String(sample.id) ? "Deleting…" : "Delete"}
								</button>
							</Form>
						),
					})}
				</tr>
			))}

			{archived ? null : (
				<tr>
					{cells(columns, labelCell, {
						[columns.label]: (
							<Form id={formId} method="post" preventScrollReset={preventScrollReset}>
								{hidden}
								<label>
									<span className="sr-only">Sample label</span>
									<input
										key={suggestedName}
										name="name"
										required
										defaultValue={suggestedName}
										aria-invalid={sampleError ? true : undefined}
										aria-describedby={sampleError ? errorId : undefined}
										className="w-24 rounded-md border border-border bg-surface px-2 py-1 font-semibold text-foreground focus:border-focus focus:outline-none"
									/>
								</label>
								{sampleError ? (
									<p id={errorId} role="alert" className="mt-2 text-sm text-danger">
										{sampleError}
									</p>
								) : null}
							</Form>
						),
						[columns.preparedBy]: (
							<>
								<label>
									<span className="sr-only">Prepared by</span>
									<select
										form={formId}
										name="preparedById"
										defaultValue=""
										aria-invalid={preparerError ? true : undefined}
										aria-describedby={preparerError ? preparerErrorId : undefined}
										className="rounded-md border border-border bg-surface px-2 py-1 text-foreground focus:border-focus focus:outline-none"
									>
										<option value="">Same as batch ({batch.preparedBy?.name ?? "Unknown"})</option>
										{preparers
											.filter((preparer) => preparer.id !== batch.preparedById)
											.map((preparer) => (
												<option key={preparer.id} value={preparer.id}>
													{preparer.name}
												</option>
											))}
									</select>
								</label>
								{preparerError ? (
									<p id={preparerErrorId} role="alert" className="mt-2 text-sm text-danger">
										{preparerError}
									</p>
								) : null}
							</>
						),
						[columns.preparedOn]: (
							<time dateTime={batch.preparationDate}>
								{formatCalendarDate(batch.preparationDate)}
							</time>
						),
						[columns.actions]: (
							<button
								form={formId}
								type="submit"
								name="add"
								value=""
								disabled={isSubmitting}
								className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
							>
								<PlusIcon className="size-4" />
								{isAdding ? "Adding…" : "Add"}
							</button>
						),
					})}
				</tr>
			)}
		</>
	);
}

/**
 * The sample table of the batch page. It brings its own table, because that
 * page shows nothing else in it.
 */
export function SampleTable(props: Omit<Parameters<typeof SampleRows>[0], "columns" | "indent">) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead className="border-b border-border text-xs font-medium text-foreground-muted">
					<tr>
						<th scope="col" className="pb-2 pr-4 pl-5">
							Sample
						</th>
						<th scope="col" className="pb-2 pr-4">
							Prepared by
						</th>
						<th scope="col" className="pb-2 pr-4">
							Prepared on
						</th>
						<th scope="col" className="w-24 pb-2 pr-5 text-left">
							<span className="sr-only">Actions</span>
						</th>
					</tr>
				</thead>

				<tbody className="divide-y divide-border">
					<SampleRows
						{...props}
						columns={{ total: 4, label: 0, preparedBy: 1, preparedOn: 2, actions: 3 }}
					/>
				</tbody>
			</table>
		</div>
	);
}
