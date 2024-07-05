/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { TToGenericTableOutput } from "../CSVImportWizzard/TToGenericTableOutput";
import { validateTToGenericTableOutput } from "./validateTToGenericTableOutput";

export function assertTToGenericTableOutput(arg: any): asserts arg is TToGenericTableOutput {
	const errors = validateTToGenericTableOutput(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type TToGenericTableOutput: " + errors[0].message);
}
