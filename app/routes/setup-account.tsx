import { data } from "react-router";

import { PasswordSetup } from "~/app/components/PasswordSetup.tsx";

import type { Route } from "./+types/setup-account.ts";

export function meta() {
	return [{ title: "Set up your account — Adacta" }];
}

export function loader({ request }: Route.LoaderArgs) {
	const params = new URL(request.url).searchParams;

	return data(
		{ token: params.has("error") ? null : params.get("token") },
		{ headers: { "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" } },
	);
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
	return loaderHeaders;
}

export default function SetupAccount({ loaderData }: Route.ComponentProps) {
	return <PasswordSetup token={loaderData.token} setup />;
}
