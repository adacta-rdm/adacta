import type { Entity, EntityName } from "~/drizzle/Schema.ts";

/**
 * Another entity already has the value of a field that must be unique.
 */
export class EntityAlreadyExistsError<
	Name extends EntityName,
	Field extends keyof Entity<Name> & string,
> extends Error {
	constructor(
		public readonly entity: Name,
		public readonly field: Field,
		public readonly value: Entity<Name>[Field],
	) {
		super(`A ${entity} with ${field} "${String(value)}" already exists.`);
		this.name = "EntityAlreadyExistsError";
	}
}
