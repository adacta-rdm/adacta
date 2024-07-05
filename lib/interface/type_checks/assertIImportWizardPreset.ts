/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IImportWizardPreset } from "../IImportWizardPreset";
import { validateIImportWizardPreset } from "./validateIImportWizardPreset";

export function assertIImportWizardPreset(arg: any): asserts arg is IImportWizardPreset {
	const errors = validateIImportWizardPreset(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type IImportWizardPreset: " + errors[0].message);
}
