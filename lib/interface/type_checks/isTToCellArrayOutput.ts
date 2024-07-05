/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { TToCellArrayOutput } from "../CSVImportWizzard/TToCellArrayOutput";
import { validateTToCellArrayOutput } from "./validateTToCellArrayOutput";

export function isTToCellArrayOutput(arg: any): arg is TToCellArrayOutput {
	return validateTToCellArrayOutput(arg).length == 0;
}
