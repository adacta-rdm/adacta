/**
 * No unique slug was found within the permitted number of attempts.
 */
export class SlugAllocationError extends Error {
	constructor(
		public readonly entity: string,
		public readonly value: string,
		public readonly base: string,
		public readonly attempts: number,
	) {
		super(`No slug was available for ${entity} "${value}" after ${attempts} attempts.`);
		this.name = "SlugAllocationError";
	}
}
