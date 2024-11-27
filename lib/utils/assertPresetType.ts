import { assertICSVPreset, assertIGamryPreset } from "@/tsrc/lib/interface/IImportWizardPreset";
import { ImportPresetType } from "~/drizzle/schema/repo.ImportPreset";
import type { ICSVPreset, IGamryPreset } from "~/lib/interface/IImportWizardPreset";

export function assertPresetType<T extends ImportPresetType>(
	type: T,
	preset: ICSVPreset | IGamryPreset
): asserts preset is T extends ImportPresetType.CSV ? ICSVPreset : IGamryPreset {
	if (type === ImportPresetType.CSV) {
		assertICSVPreset(preset);
		return;
	}

	if (type === ImportPresetType.GAMRY) {
		assertIGamryPreset(preset);
		return;
	}

	throw new Error(`Invalid preset type '${type}'`);
}
