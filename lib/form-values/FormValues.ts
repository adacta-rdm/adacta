/**
 * Reads scalar form fields as trimmed strings, typed values, or presence.
 *
 * A field is missing when the form did not submit its name. Reading a missing
 * field without a fallback throws because it usually means the form and its
 * handler disagree. For example, a renamed input is reported at the request
 * boundary instead of appearing to be an answer the user left blank.
 *
 * A field is blank when its submitted text is empty after trimming. String
 * fields keep that answer as `""`. The handler can then report that a required
 * answer is blank. Typed fields reject it because it has no value of
 * the requested type.
 *
 * Supplying a fallback makes a blank or missing field optional. The fallback
 * does not replace malformed text. For example, `integer("count", undefined)`
 * returns `undefined` for a blank field and still rejects `"twelve"`.
 * `has()` remains available when a handler needs to distinguish a blank field
 * from a missing one.
 *
 * ```ts
 * const values = new FormValues(await request.formData());
 * ```
 */
export class FormValues {
	readonly #form: FormData;

	constructor(form: FormData) {
		this.#form = form;
	}

	/**
	 * Whether the field was submitted at all.
	 *
	 * A submit button sends its name only when it is the button that was
	 * clicked. This is how a handler learns which button that was.
	 *
	 * Example:
	 * ```ts
	 * form.set("add", "");
	 * values.has("add"); // true
	 * values.has("delete"); // false
	 * ```
	 */
	has(name: string): boolean {
		return this.#form.has(name);
	}

	/**
	 * Returns trimmed text, or the fallback when the field is blank or absent.
	 *
	 * Without a fallback, a blank field returns `""`. An absent field throws.
	 *
	 * Examples:
	 * ```ts
	 * form.set("name", "  Pt batch  ");
	 * values.string("name"); // "Pt batch"
	 *
	 * form.set("support", "  ");
	 * values.string("support"); // ""
	 * values.string("support", null); // null
	 * values.string("missing", null); // null
	 * values.string("missing"); // throws MissingFormFieldError
	 * ```
	 */
	string<TFallback = never>(name: string, ...fallback: [] | [TFallback]): string | TFallback {
		const value = this.#get(name);

		if (value === undefined) {
			if (fallback.length === 1) return fallback[0];
			throw new MissingFormFieldError(name);
		}

		if (value === "") {
			if (fallback.length === 1) return fallback[0];
		}

		return value;
	}

	/**
	 * Returns the whole number submitted by a field.
	 *
	 * A fallback makes a blank or absent field optional. A submitted value that
	 * is not a whole number is always invalid.
	 *
	 * Examples:
	 * ```ts
	 * form.set("count", " 42 ");
	 * values.integer("count"); // 42
	 * values.integer("missing", undefined); // undefined
	 * values.integer("missing"); // throws MissingFormFieldError
	 *
	 * form.set("count", "12x");
	 * values.integer("count"); // throws InvalidFormFieldTypeError
	 * values.integer("count", 0); // throws InvalidFormFieldTypeError
	 * ```
	 *
	 * @throws MissingFormFieldError if the field is absent and has no fallback.
	 * @throws InvalidFormFieldTypeError if the submitted value is not an integer.
	 */
	integer<TFallback = never>(name: string, ...fallback: [] | [TFallback]): number | TFallback {
		const value = this.#get(name);

		if (value === undefined) {
			if (fallback.length === 1) return fallback[0];
			throw new MissingFormFieldError(name);
		}

		if (value === "") {
			if (fallback.length === 1) return fallback[0];
			throw new InvalidFormFieldTypeError(name, "integer");
		}

		if (!/^\d+$/.test(value)) {
			throw new InvalidFormFieldTypeError(name, "integer");
		}

		return Number(value);
	}

	#get(name: string): string | undefined {
		const value = this.#form.get(name);

		if (value === null) return undefined;

		if (typeof value === "string") return value.trim();

		throw new InvalidFormFieldTypeError(name);
	}
}

/**
 * Reports a field the form was expected to submit and did not.
 */
export class MissingFormFieldError extends Error {
	constructor(public readonly field: string) {
		super(`The form did not submit a field named "${field}".`);
		this.name = "MissingFormFieldError";
	}
}

/**
 * Reports a submitted form value that cannot be read as the requested type.
 */
export class InvalidFormFieldTypeError extends TypeError {
	constructor(
		public readonly field: string,
		public readonly expectedType?: "integer",
	) {
		super(
			expectedType
				? `Form field "${field}" must be of type ${expectedType}.`
				: `Form field "${field}" has an unexpected type.`,
		);
		this.name = "InvalidFormFieldTypeError";
	}
}
