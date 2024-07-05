/**
 * Special marker for values without a "real" unit (i.e. step count)
 *
 * Note: This value is also named "unitless" but don't confuse it with the "unitless" kind provided
 * by einheiten. The "unitless" kind is also used for units like "ppm" which still provide more
 * information than values without any units.
 */
export const UnitlessMarker = 1;
type TUnitless = typeof UnitlessMarker;
export type TUnit = string | TUnitless;
