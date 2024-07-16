/**
 * Remove this and replace with a "readable name" field.
 */
export function propertyNameToReadableString(name: string) {
	// If the name is empty, return an empty string
	// This can (in theory) happen if the user enters a name consisting the separator character for
	// twice in a row (i.e. foo//bar = ["foo", "", "bar"])
	if (name === "") {
		return "";
	}

	return name[0].toUpperCase() + name.slice(1);
}
