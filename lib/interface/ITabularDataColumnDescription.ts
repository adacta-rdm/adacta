import type { IDeviceId } from "../database/Ids";
import type { TUnit } from "../importWizard/ImportWizardUnit";

/**
 * Used  for DB storage. In e.g. importer ui components use
 * `ITextFileImporterColumnDescriptionOrSkip`.
 */
export interface ITabularDataColumnDescription {
	type: "number" | "datetime";

	/**
	 * Original header of the column
	 */
	title: string;

	/**
	 * Header with a suffix appended to make the column name unique (within this resource)
	 */
	columnId?: string;

	/**
	 * Depending on the unit this field can for example hold information about a species type or where
	 * a temperature was measured. The possible values are currently restricted by the UI via a
	 * dropdown box.
	 */
	description: string;

	/**
	 * The unit of the column. Contains the value `1` for unitless numbers.
	 */
	unit: TUnit;

	/**
	 * With which the data in the column was recorded with. Optional.
	 */
	deviceId?: IDeviceId;

	/**
	 * Indices of column this column depends on.
	 * A boolean (independent/dependent variable) is not enough if we want to, for example, support
	 * resources that contain some columns that depend on two x columns and some columns that depend
	 * on one x column.
	 *
	 * Example:
	 *
	 *  posX,    radius,   T/K,     Walltemp/K
	 *  1,       1,        500,     1               -> T(1,1) = 500        Walltemp(1) = 1
	 *  1,       2,        501,     1               -> T(1,2) = 501        Walltemp(1) = 1
	 *  1,       3,        502,     1               -> T(1,3) = 502        Walltemp(1) = 1
	 *  2,       1,        510,     2               -> T(2,1) = 510        Walltemp(2) = 2
	 *  2,       2,        511,     2               -> T(2,2) = 511        Walltemp(2) = 2
	 *  2,       3,        512,     2               -> T(2,3) = 512        Walltemp(2) = 2
	 *
	 */
	independentVariables: number[]; // Column indices
}
