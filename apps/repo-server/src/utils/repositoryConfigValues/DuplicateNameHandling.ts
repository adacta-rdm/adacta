import type { ISerializer } from "../../graphql/context/RepositoryConfig";

export enum DuplicateNameHandling {
	/**
	 * Don't do anything if a duplicate name is found (allow duplicate names)
	 */
	IGNORE = "IGNORE",

	/**
	 * Warn the user if a duplicate name is found.
	 *
	 * This option is the default.
	 */
	WARN = "WARN",

	/**
	 *  Disallow creation of a new elements if a duplicate name is found
	 */
	DENY = "DENY",
}

export const DuplicateNameHandlingSerializer: ISerializer<DuplicateNameHandling> = {
	serialize(value: DuplicateNameHandling): string {
		return value.toString();
	},
	deserialize(dbValue: string): DuplicateNameHandling {
		if (dbValue == "IGNORE" || dbValue == "WARN" || dbValue == "DENY") {
			return DuplicateNameHandling[dbValue];
		}

		throw new Error(`Invalid duplicate name handling value: ${dbValue}`);
	},
};
