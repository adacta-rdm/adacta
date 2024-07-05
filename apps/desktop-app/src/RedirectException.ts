import { RedirectException as FoundRedirectException } from "found";

import type { RouterArgs } from "./routes";
import { resolveLocation } from "./routes/utils/resolveLocation";

export class RedirectException extends FoundRedirectException {
	public constructor(...to: RouterArgs) {
		super(resolveLocation(...to));
	}
}
