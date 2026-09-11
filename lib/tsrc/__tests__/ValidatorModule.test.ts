import { describe, expect, it } from "bun:test";

import { ValidatorModule } from "~/lib/tsrc/src/ValidatorModule";
import type { ModulePath } from "~/lib/tsrc/types/ModulePath";
import type { ValidationExpression } from "~/lib/tsrc/types/ValidationExpression";

const path = "address" as ModulePath;
const accept: ValidationExpression = { kind: "accept" };

describe("ValidatorModule.declareFunction", () => {
	it("prefixes the type name and stores the function", () => {
		const module = new ValidatorModule(path);

		const fn = module.declareFunction("Address", accept);

		expect(fn.name).toBe("validateAddress");
		expect(module.functions).toEqual([fn]);
	});

	it("returns the existing function for the same type name", () => {
		const module = new ValidatorModule(path);

		const first = module.declareFunction("Address", accept);
		const second = module.declareFunction("Address", accept);

		expect(second).toBe(first);
		expect(module.functions).toHaveLength(1);
	});

	it("upgrades export status from private to public but never back", () => {
		const module = new ValidatorModule(path);

		const fn = module.declareFunction("Address", accept, false);
		expect(fn.exported).toBe(false);

		module.declareFunction("Address", accept, true);
		expect(fn.exported).toBe(true);

		module.declareFunction("Address", accept, false);
		expect(fn.exported).toBe(true);
	});
});

describe("ValidatorModule.importValidator", () => {
	it("imports a validator from another module and exports the source", () => {
		const source = new ValidatorModule("address" as ModulePath);
		const target = new ValidatorModule("person" as ModulePath);
		const fn = source.declareFunction("Address", accept);

		target.importValidator(fn);

		expect(fn.exported).toBe(true);
		// No alias is stored when the local name equals the exported name.
		expect(target.imports).toEqual([{ function: fn }]);
	});

	it("does not import a validator that belongs to the same module", () => {
		const module = new ValidatorModule(path);
		const fn = module.declareFunction("Address", accept);

		module.importValidator(fn);

		expect(module.imports).toEqual([]);
	});

	it("does not duplicate an existing import", () => {
		const source = new ValidatorModule("address" as ModulePath);
		const target = new ValidatorModule("person" as ModulePath);
		const fn = source.declareFunction("Address", accept);

		target.importValidator(fn);
		target.importValidator(fn);

		expect(target.imports).toHaveLength(1);
	});

	it("allocates a collision-free local name", () => {
		const source = new ValidatorModule("address" as ModulePath);
		const target = new ValidatorModule("person" as ModulePath);
		// The target already has its own validateAddress function.
		target.declareFunction("Address", accept);
		const fn = source.declareFunction("Address", accept);

		target.importValidator(fn);

		expect(target.imports[0].localName).toBe("validateAddress2");
	});
});

describe("ValidatorModule.localNameFor", () => {
	it("returns the plain name for a same-module validator", () => {
		const module = new ValidatorModule(path);
		const fn = module.declareFunction("Address", accept);

		expect(module.localNameFor(fn)).toBe("validateAddress");
	});

	it("returns the allocated alias for an imported validator", () => {
		const source = new ValidatorModule("address" as ModulePath);
		const target = new ValidatorModule("person" as ModulePath);
		target.declareFunction("Address", accept);
		const fn = source.declareFunction("Address", accept);
		target.importValidator(fn);

		expect(target.localNameFor(fn)).toBe("validateAddress2");
	});
});
