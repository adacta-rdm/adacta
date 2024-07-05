/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { TToCellArrayOutput } from "../CSVImportWizzard/TToCellArrayOutput";
import { validateTToCellArrayOutput } from "./validateTToCellArrayOutput";

export function assertTToCellArrayOutput(arg: any): asserts arg is TToCellArrayOutput {
	const errors = validateTToCellArrayOutput(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type TToCellArrayOutput: " + errors[0].message);
}
