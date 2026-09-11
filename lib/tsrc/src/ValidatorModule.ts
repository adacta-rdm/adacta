import type { ModulePath } from "~/lib/tsrc/types/ModulePath";
import type { ValidationExpression } from "~/lib/tsrc/types/ValidationExpression";

/**
 * Describes the imports and validator functions generated for one module.
 */
export class ValidatorModule {
	constructor(public modulePath: ModulePath) {}

	private readonly _imports: ValidatorImport[] = [];
	private readonly _functions: ValidatorFunction[] = [];
	private readonly _roots: RootValidator[] = [];

	get imports(): readonly ValidatorImport[] {
		return this._imports;
	}

	get functions(): readonly ValidatorFunction[] {
		return this._functions;
	}

	get roots(): readonly RootValidator[] {
		return this._roots;
	}

	/**
	 * Declares a requested root type and its public validator.
	 *
	 * The root gets the same shared validator function as any other declaration,
	 * plus a record so the renderer can emit the public `is`, `assert`, and `cast`
	 * helpers the ambient declarations promise. The type name is kept separate
	 * from the validator name, which may carry a collision suffix.
	 */
	declareRoot(typeName: string, expression: ValidationExpression): ValidatorFunction {
		const validator = this.declareFunction(typeName, expression, true);
		this._roots.push({ typeName, validator });
		return validator;
	}

	/**
	 * Finds or creates the validator function for a declared type.
	 *
	 * Reuse is keyed by the expression, not the name: one resolved type maps to
	 * one function, so a repeated declaration returns the same function. The name
	 * is only a label. When two different types would produce the same
	 * `validate<TypeName>` name (for example same-named interfaces from different
	 * files), the second gets a numeric suffix so their distinct shapes keep
	 * distinct validators.
	 */
	declareFunction(
		typeName: string,
		expression: ValidationExpression,
		exported = false,
	): ValidatorFunction {
		let fn = this._functions.find((candidate) => candidate.expression === expression);

		if (!fn) {
			const baseName = `validate${typeName}`;
			let name = baseName;
			let suffix = 2;

			while (this._functions.some((candidate) => candidate.name === name)) {
				name = `${baseName}${suffix++}`;
			}

			fn = { module: this, name, exported, expression };
			this._functions.push(fn);
		}

		// Export status only ever moves from private to public.
		if (exported) fn.exported = true;

		return fn;
	}

	/**
	 * Ensures this module can call a validator declared in another module.
	 *
	 * A same-module validator needs no import. A cross-module validator is
	 * imported once under a local name that avoids the module's existing function
	 * and import names, and its source function is marked exported.
	 */
	importValidator(called: ValidatorFunction): void {
		if (called.module === this) return;

		if (this.findImport(called)) return;

		const usedNames = new Set([
			...this._functions.map((validator) => validator.name),
			...this._imports.map((validatorImport) => this.localNameFor(validatorImport.function)),
		]);
		let localName = called.name;
		let suffix = 2;

		while (usedNames.has(localName)) localName = `${called.name}${suffix++}`;

		called.exported = true;
		// Only keep the alias when it differs from the exported name.
		this._imports.push(
			localName === called.name ? { function: called } : { function: called, localName },
		);
	}

	/**
	 * Returns the name this module uses to call a validator.
	 *
	 * A same-module validator is called by its own name. A cross-module validator
	 * is called by the local name allocated when it was imported.
	 */
	localNameFor(called: ValidatorFunction): string {
		if (called.module === this) return called.name;

		return this.findImport(called)?.localName ?? called.name;
	}

	private findImport(called: ValidatorFunction): ValidatorImport | undefined {
		return this._imports.find((imported) => imported.function === called);
	}
}

/**
 * Pairs a requested root type name with its validator function.
 *
 * The renderer uses the type name for the public `is`/`assert`/`cast` helpers
 * and the validator to call from them.
 */
export interface RootValidator {
	readonly typeName: string;
	readonly validator: ValidatorFunction;
}

/**
 * Describes one validator imported from another generated module.
 *
 * The importing module allocates the local name, because the alias depends on
 * the other identifiers already used there. The renderer only writes the
 * corresponding import statement.
 */
export interface ValidatorImport {
	readonly function: ValidatorFunction;

	/** Set only when the local name differs from the function's exported name. */
	readonly localName?: string;
}

/**
 * Describes one generated validator function and its validation body.
 */
export interface ValidatorFunction {
	readonly module: ValidatorModule;
	readonly name: string;
	exported: boolean;
	readonly expression: ValidationExpression;
}
