import { RedirectException } from "../RedirectException";

import type { GetDataArgs } from "@/routes/logout";

function getData({ graphQLHeaders }: GetDataArgs) {
	graphQLHeaders.authToken = undefined;
	throw new RedirectException("/login");
}

export default function Route() {
	return null;
}
