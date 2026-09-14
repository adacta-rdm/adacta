/**
 * The quantity kinds this system understands.
 *
 * A quantity kind says what a number means. A channel reporting 250 says
 * nothing until its quantity kind says that the number is a temperature.
 *
 * Each key is a term taken from QUDT, spelled exactly as QUDT spells it. QUDT
 * publishes these terms at http://qudt.org/vocab/quantitykind/, so the page for
 * the key "VolumeFlowRate" is at that address followed by the key.
 *
 * Take the next name from there rather than inventing one. QUDT names over a
 * thousand quantity kinds and a laboratory uses a handful, so the name is
 * almost certainly already chosen, and taking it ends the argument about what
 * to call it.
 *
 * This list is the source of truth. It becomes a table in the database when
 * the baseline migration stops being regenerated, and the keys below become
 * its primary keys. Until then the database column is plain text, so every
 * place a value enters is checked against this list instead.
 */

/**
 * This type records how a quantity is built from the SI base units. Each key is
 * a base unit symbol. Its value is the exponent of that unit. For example,
 * `{ m: 2, kg: 1, s: -3 }` describes power. Zero exponents are omitted.
 *
 * The dimensions of a recording and a quantity kind must agree. For example, a
 * volume flow rate has the dimension `{ m: 3, s: -1 }`. A temperature has the
 * dimension `{ K: 1 }`. These kinds therefore describe different values.
 *
 * Dimension alone does not determine conversion. Temperature and temperature
 * difference have the same dimension. However, their conversion rules differ.
 */
export type Dimension = Partial<Record<"m" | "kg" | "s" | "A" | "K" | "mol" | "cd", number>>;

export interface QuantityKindEntry {
	/** What a reader sees, for example "Volume flow rate". */
	name: string;

	/** How the quantity is built from the SI base units. */
	dimension: Dimension;
}

export const QUANTITY_KINDS = {
	Mass: {
		name: "Mass",
		dimension: { kg: 1 },
	},

	Power: {
		name: "Power",
		dimension: { m: 2, kg: 1, s: -3 },
	},

	Pressure: {
		name: "Pressure",
		dimension: { m: -1, kg: 1, s: -2 },
	},

	/*
		QUDT holds both "Temperature" and "ThermodynamicTemperature". The
		thermodynamic one accepts only absolute scales, so kelvin and rankine but
		not degrees Celsius. A thermocouple in a reactor is logged in degrees
		Celsius, so the plain one is taken here.
	*/
	/*
		QUDT also defines "ThermodynamicTemperature". That term accepts only
		absolute scales, so kelvin and rankine but not degrees Celsius. Laboratory
		instruments record in degrees Celsius. Therefore this list uses
		"Temperature".
	*/
	Temperature: {
		name: "Temperature",
		dimension: { K: 1 },
	},

	/*
		A difference of two temperatures, not a temperature. The two convert
		differently, because a temperature scale has an offset and a difference
		does not. A difference of 5 degrees Celsius is a difference of 9 degrees
		Fahrenheit. A temperature of 5 degrees Celsius is 41 degrees Fahrenheit.

		A channel reporting how much hotter the outlet is than the inlet is
		therefore a different quantity kind from one reporting how hot the
		outlet is, and saying so is what keeps its values convertible.
	*/
	TemperatureDifference: {
		name: "Temperature difference",
		dimension: { K: 1 },
	},

	VolumeFlowRate: {
		name: "Volume flow rate",
		dimension: { m: 3, s: -1 },
	},
} as const satisfies Record<string, QuantityKindEntry>;

/** The name of a quantity kind this system understands. */
export type QuantityKindId = keyof typeof QUANTITY_KINDS;

/**
 * Whether this system understands the given name.
 *
 * Used where a value enters, so that a name nothing can act on is refused at
 * the boundary rather than stored.
 */
export function isQuantityKind(value: string): value is QuantityKindId {
	return Object.hasOwn(QUANTITY_KINDS, value);
}

/**
 * What a reader sees for the given name.
 *
 * A name this build does not know is given back as it stands. That name is the
 * published term, so showing it is better than showing nothing.
 */
export function quantityKindName(value: string): string {
	return isQuantityKind(value) ? QUANTITY_KINDS[value].name : value;
}
