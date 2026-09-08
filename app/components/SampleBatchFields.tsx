/**
 * The fields that describe a sample batch.
 *
 * The create page and the edit page ask for the same things. The create page
 * starts with empty fields and the current user as preparer. The edit page
 * starts with the values the batch already has.
 */
export interface SampleBatchValues {
	name: string;
	preparationDate: string;
	preparedById: string;
	activeMaterial: string;
	support: string;
}

export interface Preparer {
	id: string;
	name: string;
}

const INPUT =
	"mt-2 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground placeholder:text-foreground-muted focus:border-focus focus:outline-none";

function Field({
	name,
	label,
	defaultValue,
	required,
	placeholder,
	type = "text",
	description,
}: {
	name: string;
	label: string;
	defaultValue: string;
	required?: boolean;
	placeholder?: string;
	type?: "text" | "date";
	description?: string;
}) {
	return (
		<label className="block">
			<span className="text-sm font-medium text-foreground">{label}</span>

			{description ? (
				<span className="mt-1 block text-sm text-foreground-muted">{description}</span>
			) : null}

			<input
				name={name}
				type={type}
				required={required}
				placeholder={placeholder}
				defaultValue={defaultValue}
				className={INPUT}
			/>
		</label>
	);
}

export function SampleBatchFields({
	preparers,
	values,
}: {
	preparers: readonly Preparer[];
	values: SampleBatchValues;
}) {
	return (
		<>
			<Field name="name" label="Batch name" required defaultValue={values.name} />

			<Field
				name="preparationDate"
				label="Preparation date"
				type="date"
				required
				description="The date on which the batch material was prepared."
				defaultValue={values.preparationDate}
			/>

			<label className="block">
				<span className="text-sm font-medium text-foreground">Prepared by</span>
				<select name="preparedById" required defaultValue={values.preparedById} className={INPUT}>
					{preparers.map((preparer) => (
						<option key={preparer.id} value={preparer.id}>
							{preparer.name}
						</option>
					))}
				</select>
			</label>

			<Field
				name="activeMaterial"
				label="Active material"
				placeholder="Pt"
				defaultValue={values.activeMaterial}
			/>

			<Field name="support" label="Support" placeholder="Al2O3" defaultValue={values.support} />
		</>
	);
}
