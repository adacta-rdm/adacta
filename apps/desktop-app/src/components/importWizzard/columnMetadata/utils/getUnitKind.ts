import { Qty } from "@omegadot/einheiten";
import type { UnitKind } from "@omegadot/einheiten/dist/types/quantities/kind";

import type { TUnit } from "~/lib/importWizard/ImportWizardUnit";
import { UnitlessMarker } from "~/lib/importWizard/ImportWizardUnit";

export function getUnitKind(u: TUnit): UnitKind | "" {
	if (u === UnitlessMarker) {
		return "unitless";
	}

	if (u === "") {
		return "";
	}

	const kind = Qty.parse(u)?.kind();
	if (kind) {
		return kind;
	}

	return "";
}
