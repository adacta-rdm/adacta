import { PlusIcon, TrashIcon } from "@heroicons/react/20/solid";
import { Form, useActionData, useNavigation, useRouteLoaderData } from "react-router";

import { formatTimestamp } from "~/app/lib/dates.ts";
import { nextSampleName } from "~/app/lib/sampleNames.ts";
import type { action, loader } from "~/app/routes/$repo.samples.$batchSlug.tsx";
import { Subheading } from "~/catalyst-ui/heading.tsx";

/**
 * The samples of one batch, including the row that adds another one.
 */
export function SampleTable() {
	const loaderData = useRouteLoaderData<typeof loader>("routes/$repo.samples.$batchSlug")!;
	const { batch, samples, users } = loaderData;

	const suggestedName = nextSampleName(samples.map((sample) => sample.name));

	const actionErrors = useActionData<typeof action>()?.errors;
	const sampleError = actionErrors?.name ?? actionErrors?.form;
	const preparerError = actionErrors?.preparedById;

	const navigation = useNavigation();
	/*
		A submission is busy until the new page data has arrived. React Router
		reports "submitting" while the action runs, then "loading" while the
		loaders run again. The form data is set during both. Reading only
		"submitting" releases the buttons for the few milliseconds before the
		new rows arrive, and that shows as a flicker.
	*/
	const submitted = navigation.formData;
	const isSubmitting = submitted !== undefined;
	const isAdding = submitted?.has("add") ?? false;
	const deletingSampleId = submitted?.get("delete");

	return (
		<section className="overflow-hidden rounded-xl border border-border bg-surface">
			<div className="px-5 pt-5">
				<Subheading>Samples</Subheading>
			</div>
			<div className="mt-4 overflow-x-auto">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border text-xs font-medium text-foreground-muted">
						<tr>
							<th scope="col" className="pb-2 pl-5 pr-4">
								Sample
							</th>
							<th scope="col" className="pb-2 pr-4">
								Prepared by
							</th>
							<th scope="col" className="pb-2 pr-4">
								Added to Adacta
							</th>
							<th scope="col" className="w-24 pb-2 pr-5 text-left">
								<span className="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{samples
							.filter((sample) => !sample.metadataArchivedAt)
							.map((sample) => (
								<tr key={sample.id}>
									<th scope="row" className="py-3 pl-5 pr-4 font-normal text-foreground">
										<span className="text-foreground-muted">{batch.name}</span>{" "}
										<span className="rounded bg-surface-muted px-1.5 py-0.5 font-semibold">
											{sample.name}
										</span>
									</th>
									<td className="py-3 pr-4 text-foreground-muted">
										{sample.preparedBy?.name ?? "Unknown"}
									</td>
									<td className="py-3 pr-4 text-foreground-muted">
										<time dateTime={sample.metadataCreationTimestamp.toISOString()}>
											{formatTimestamp(sample.metadataCreationTimestamp)}
										</time>
									</td>
									<td className="py-3 pr-5 text-left">
										<Form method="post">
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
									</td>
								</tr>
							))}
					</tbody>
					<tbody>
						<tr className="border-t-2 border-border-strong bg-surface-muted">
							<th scope="row" className="py-3 pl-5 pr-4 font-normal text-foreground">
								<Form id="add-sample-form" method="post">
									<label className="flex items-center gap-1.5">
										<span className="text-foreground-muted">{batch.name}</span>
										<span className="sr-only">Sample label</span>
										<input
											key={suggestedName}
											name="name"
											required
											defaultValue={suggestedName}
											aria-invalid={sampleError ? true : undefined}
											aria-describedby={sampleError ? "add-sample-error" : undefined}
											className="w-24 rounded-md border border-border bg-surface px-2 py-1 font-semibold text-foreground focus:border-focus focus:outline-none"
										/>
									</label>
									{sampleError ? (
										<p id="add-sample-error" role="alert" className="mt-2 text-sm text-danger">
											{sampleError}
										</p>
									) : null}
								</Form>
							</th>
							<td className="py-3 pr-4 text-foreground-muted">
								<label>
									<span className="sr-only">Prepared by</span>
									<select
										form="add-sample-form"
										name="preparedById"
										defaultValue=""
										aria-invalid={preparerError ? true : undefined}
										aria-describedby={preparerError ? "sample-preparer-error" : undefined}
										className="rounded-md border border-border bg-surface px-2 py-1 text-foreground focus:border-focus focus:outline-none"
									>
										<option value="">Same as batch ({batch.preparedBy?.name ?? "Unknown"})</option>
										{[...users.values()]
											.filter((preparer) => preparer.id !== batch.preparedById)
											.map((preparer) => (
												<option key={preparer.id} value={preparer.id}>
													{preparer.name}
												</option>
											))}
									</select>
								</label>
								{preparerError ? (
									<p id="sample-preparer-error" role="alert" className="mt-2 text-sm text-danger">
										{preparerError}
									</p>
								) : null}
							</td>
							<td className="py-3 pr-4 text-foreground-muted">Not added yet</td>
							<td className="py-3 pr-5 text-left">
								<button
									form="add-sample-form"
									type="submit"
									name="add"
									value=""
									disabled={isSubmitting}
									className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-foreground-muted hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
								>
									<PlusIcon className="size-4" />
									{isAdding ? "Adding…" : "Add"}
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>
	);
}
