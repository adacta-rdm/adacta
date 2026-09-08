/**
 * Reading the fields of a sample batch form.
 *
 * The create page and the edit page send the same fields and apply the same
 * rules. This module holds those rules once, so the two pages cannot drift
 * apart.
 */
import { isCalendarDate } from "~/app/lib/dates.ts";
import { slugify } from "~/app/lib/slugs.ts";
import type { FormValues } from "~/lib/form-values/FormValues.ts";

export interface SampleBatchFields {
	name: string;
	preparationDate: string;
	preparedById: string;
	activeMaterial: string | null;
	support: string | null;
}

export type SampleBatchFieldsResult =
	| { ok: true; fields: SampleBatchFields }
	| { ok: false; error: string };

/**
 * Read the fields of a batch form. A field that breaks a rule stops the read
 * and gives back a message for the person at the form. For example,
 * "2026-02-31" has the shape of a date, and February has no 31st.
 *
 * Whether the chosen preparer may open the repository is not decided here.
 * That question needs the database.
 */
export function readSampleBatchFields(values: FormValues): SampleBatchFieldsResult {
	const name = values.string("name");
	const preparationDate = values.string("preparationDate");
	const preparedById = values.string("preparedById");

	if (!name) {
		return { ok: false, error: "A batch name is required." };
	}

	// The name becomes the URL of the batch. A name of only punctuation leaves
	// nothing to build one from.
	if (!slugify(name)) {
		return { ok: false, error: "A batch name must contain at least one letter or number." };
	}

	if (!isCalendarDate(preparationDate)) {
		return { ok: false, error: "The preparation date is not a valid calendar date." };
	}

	if (!preparedById) {
		return { ok: false, error: "A preparer is required." };
	}

	return {
		ok: true,
		fields: {
			name,
			preparationDate,
			preparedById,

			// An empty box means the value is unknown. It is stored as no value
			// rather than as an empty text.
			activeMaterial: values.string("activeMaterial", null),
			support: values.string("support", null),
		},
	};
}
