import { RedirectException as FoundRedirectException } from "found";

import { resolveLocation } from "./utils/resolveLocation";

import type { RouterArgs } from "@/routes";

export class RedirectException extends FoundRedirectException {
	public constructor(...to: RouterArgs) {
		super(resolveLocation(...to));
	}
}
