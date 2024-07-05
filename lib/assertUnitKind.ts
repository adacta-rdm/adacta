import { AssertionError } from "assert";

import { Qty } from "@omegadot/einheiten";
import type { UnitKind } from "@omegadot/einheiten/dist/types/quantities/kind";
import { difference } from "lodash";

export function assertUnitKind(kind: string): asserts kind is UnitKind {
	if (!Qty.getKinds().includes(kind as UnitKind)) {
		throw new AssertionError({ message: `Unit kind ${kind} is not a valid unit kind` });
	}
}

export function assertUnitKinds(kind: string[] | Readonly<string[]>): asserts kind is UnitKind[] {
	const inputUnique = [...new Set(kind)];
	const validKinds = Qty.getKinds();

	const invalidUnits = difference(inputUnique, validKinds);

	if (invalidUnits.length > 0) {
		throw new AssertionError({
			message: `The following unit kinds are not valid unit kinds: ${invalidUnits.join(",")}`,
		});
	}
}
