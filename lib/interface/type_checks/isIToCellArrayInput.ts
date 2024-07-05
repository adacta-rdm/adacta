/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IToCellArrayInput } from "../CSVImportWizzard/IToCellArrayInput";
import { validateIToCellArrayInput } from "./validateIToCellArrayInput";

export function isIToCellArrayInput(arg: any): arg is IToCellArrayInput {
	return validateIToCellArrayInput(arg).length == 0;
}
