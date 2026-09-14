/**
 * This list defines the quantity kinds supported by the system.
 *
 * A quantity kind identifies the physical meaning of a value. For example, the
 * value 250 could represent a temperature or a pressure. The quantity kind
 * tells the application which interpretation applies.
 *
 * Each key is an identifier from http://qudt.org/vocab/quantitykind/.
 *
 * The QuantityKind table stores these keys for use as foreign keys.
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
		Temperature and temperature difference are separate kinds. A temperature
		scale has an offset. A temperature difference does not. Therefore, a
		difference of 5 degrees Celsius equals a difference of 9 degrees Fahrenheit.
		A temperature of 5 degrees Celsius equals 41 degrees Fahrenheit.

		Both kinds have the same dimension. The dimension cannot distinguish them.
	*/
	TemperatureDifference: {
		name: "Temperature difference",
		dimension: { K: 1 },
	},

	VolumeFlowRate: {
		name: "Volume flow rate",
		dimension: { m: 3, s: -1 },
	},
} as const satisfies Record<string, { name: string; dimension: Dimension }>;

/**
 * The name of a quantity kind supported by the system.
 */
export type QuantityKindId = keyof typeof QUANTITY_KINDS;

/**
 * Checks whether the system supports a quantity kind.
 *
 * Callers use this check before storing a quantity kind. Unknown names fail
 * the check.
 */
export function isQuantityKind(value: string): value is QuantityKindId {
	return Object.hasOwn(QUANTITY_KINDS, value);
}

/**
 * Returns the display name for a quantity kind.
 *
 * The function returns an unknown name unchanged. This keeps a stored term
 * visible until the system supports it.
 */
export function quantityKindName(id: string): string {
	return isQuantityKind(id) ? QUANTITY_KINDS[id].name : id;
}
