/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IToCellArrayInput } from "../CSVImportWizzard/IToCellArrayInput";
import { validateIToCellArrayInput } from "./validateIToCellArrayInput";

export function assertIToCellArrayInput(arg: any): asserts arg is IToCellArrayInput {
	const errors = validateIToCellArrayInput(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type IToCellArrayInput: " + errors[0].message);
}
