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
 *
 * Each quantity kind lists the units a laboratory plausibly writes. Each unit
 * key is an identifier from http://qudt.org/vocab/unit/. The first spelling of
 * a unit is its display symbol.
 *
 * The units are a curated list of the units in common laboratory use. Valid
 * units that a laboratory rarely writes are left out. Each of them would let a
 * typing error pass as a correct unit. For example, Mg is a megagram, 10⁹
 * times a milligram. A phone keyboard that capitalizes m, or OCR that reads m
 * as M, would therefore store a wrong value without a warning.
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
	// Apparent power is rated in volt-amperes. Converting it to active power
	// in watts requires the power factor, even though the dimensions agree.
	ApparentPower: {
		name: "Apparent power",
		dimension: { m: 2, kg: 1, s: -3 },
		units: {
			VA: ["VA"],
			KiloVA: ["kVA"],
		},
	},

	Count: {
		name: "Count",
		dimension: {},
		units: { NUM: ["#"] },
	},

	ElectricCurrent: {
		name: "Electric current",
		dimension: { A: 1 },
		units: {
			PicoA: ["pA"],
			NanoA: ["nA"],
			MicroA: ["μA", "µA", "uA"],
			MilliA: ["mA"],
			A: ["A"],
		},
	},

	Frequency: {
		name: "Frequency",
		dimension: { s: -1 },
		units: {
			HZ: ["Hz"],
			KiloHZ: ["kHz"],
			MegaHZ: ["MHz"],
		},
	},

	Length: {
		name: "Length",
		dimension: { m: 1 },
		units: {
			NanoM: ["nm"],
			MicroM: ["μm", "µm", "um"],
			MilliM: ["mm"],
			CentiM: ["cm"],
			M: ["m"],
			IN: ["in", "in.", '"', "″"],
		},
	},

	// Magnification compares image and object lengths. It has no written unit.
	LengthRatio: {
		name: "Length ratio",
		dimension: {},
		units: {},
	},

	Mass: {
		name: "Mass",
		dimension: { kg: 1 },
		units: {
			// QUDT uses Greek mu (U+03BC). Keyboards also produce the micro sign
			// (U+00B5) or the ASCII letter u.
			//
			// QUDT also defines the grain, about 64.8 mg. People in several
			// languages write gr for the gram. Accepting gr as a grain would store
			// the wrong value. Hence, the grain is left out.
			MicroGM: ["μg", "µg", "ug"],
			MilliGM: ["mg"],
			GM: ["g"],
			KiloGM: ["kg"],
			TONNE: ["t"],
		},
	},

	MassFlowRate: {
		name: "Mass flow rate",
		dimension: { kg: 1, s: -1 },
		units: {
			"MilliGM-PER-HR": ["mg/h"],
			"MilliGM-PER-MIN": ["mg/min"],
			"MilliGM-PER-SEC": ["mg/s"],
			"GM-PER-HR": ["g/h"],
			"GM-PER-MIN": ["g/min"],
			"GM-PER-SEC": ["g/s"],
			"KiloGM-PER-HR": ["kg/h"],
			"KiloGM-PER-SEC": ["kg/s"],
		},
	},

	MoleFraction: {
		name: "Mole fraction",
		dimension: {},
		units: {},
	},

	// A valve opening is a fraction of its full range. An open-or-closed
	// state has no physical quantity.
	OpeningRatio: {
		name: "Opening ratio",
		dimension: {},
		units: { PERCENT: ["%"] },
	},

	PlaneAngle: {
		name: "Plane angle",
		dimension: {},
		units: {
			DEG: ["°", "deg"],
			RAD: ["rad"],
		},
	},

	Power: {
		name: "Power",
		dimension: { m: 2, kg: 1, s: -3 },
		units: {
			// MW is left out. It is 10⁹ times mW, as Mg is 10⁹ times mg.
			MilliW: ["mW"],
			W: ["W"],
			KiloW: ["kW"],
		},
	},

	Pressure: {
		name: "Pressure",
		dimension: { m: -1, kg: 1, s: -2 },
		units: {
			// These unit pages list ForcePerArea. QUDT explicitly lists them as
			// applicable units at http://qudt.org/vocab/quantitykind/Pressure.
			PA: ["Pa"],
			KiloPA: ["kPa"],
			MegaPA: ["MPa"],
			MilliBAR: ["mbar"],
			BAR: ["bar"],
		},
	},

	SpecificSurfaceArea: {
		name: "Specific surface area",
		dimension: { m: 2, kg: -1 },
		units: {
			"M2-PER-GM": ["m²/g", "m2/g"],
			"M2-PER-KiloGM": ["m²/kg", "m2/kg"],
		},
	},

	// A pore volume per sample mass is a specific volume. For example,
	// cm³/g describes a different quantity from a volume in cm³.
	SpecificVolume: {
		name: "Specific volume",
		dimension: { m: 3, kg: -1 },
		units: {
			"CentiM3-PER-GM": ["cm³/g", "cm3/g"],
			"MilliL-PER-GM": ["mL/g", "ml/g"],
			"M3-PER-KiloGM": ["m³/kg", "m3/kg"],
		},
	},

	// QUDT also defines "ThermodynamicTemperature". That term accepts only
	// absolute scales, so kelvin and rankine but not degrees Celsius. We
	// choose to use "Temperature" (instead of "ThermodynamicTemperature")
	// in order to support degrees Celsius, too.
	Temperature: {
		name: "Temperature",
		dimension: { K: 1 },
		units: {
			DEG_C: ["°C", "degC", "℃"],
			K: ["K"],
		},
	},

	// Temperature and temperature difference are separate kinds. A temperature
	// scale has an offset. A temperature difference does not. Therefore, a
	// difference of 5 degrees Celsius equals a difference of 9 degrees Fahrenheit.
	// A temperature of 5 degrees Celsius equals 41 degrees Fahrenheit.
	//
	// Both kinds have the same dimension. The dimension cannot distinguish them.
	TemperatureDifference: {
		name: "Temperature difference",
		dimension: { K: 1 },
		units: { DEG_C: ["°C", "degC", "℃"], K: ["K"] },
	},

	TemperaturePerTime: {
		name: "Temperature per time",
		dimension: { K: 1, s: -1 },
		units: {
			"K-PER-SEC": ["K/s"],
			"K-PER-MIN": ["K/min"],
			"K-PER-HR": ["K/h"],
			"DEG_C-PER-SEC": ["°C/s", "degC/s", "℃/s"],
			"DEG_C-PER-MIN": ["°C/min", "degC/min", "℃/min"],
			"DEG_C-PER-HR": ["°C/h", "degC/h", "℃/h"],
		},
	},

	Time: {
		name: "Time",
		dimension: { s: 1 },
		units: {
			MicroSEC: ["μs", "µs", "us"],
			MilliSEC: ["ms"],
			SEC: ["s"],
			MIN: ["min"],
			HR: ["h"],
			DAY: ["d"],
		},
	},

	Voltage: {
		name: "Voltage",
		dimension: { m: 2, kg: 1, s: -3, A: -1 },
		units: {
			MicroV: ["μV", "µV", "uV"],
			MilliV: ["mV"],
			V: ["V"],
			KiloV: ["kV"],
		},
	},

	Volume: {
		name: "Volume",
		dimension: { m: 3 },
		units: {
			MicroL: ["μL", "µL", "uL", "μl", "µl", "ul"],
			MilliL: ["mL", "ml"],
			L: ["L", "l"],
			CentiM3: ["cm³", "cm3"],
			M3: ["m³", "m3"],
		},
	},

	VolumeFlowRate: {
		name: "Volume flow rate",
		dimension: { m: 3, s: -1 },
		units: {
			// Both L and l are used when people write liters.
			"MilliL-PER-MIN": ["mL/min", "ml/min"],
			"L-PER-MIN": ["L/min", "l/min"],
			"L-PER-HR": ["L/h", "l/h"],
		},
	},
} as const satisfies Record<string, { name: string; dimension: Dimension; units: Units }>;

/**
 * The name of a quantity kind supported by the system.
 */
export type QuantityKindId = keyof typeof QUANTITY_KINDS;

/**
 * The QUDT identifier of a unit in any quantity kind. For example, "GM" is
 * the gram.
 */
export type UnitId = {
	[Kind in QuantityKindId]: keyof (typeof QUANTITY_KINDS)[Kind]["units"];
}[QuantityKindId];

type Units = Record<string, readonly string[]>;

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
