import { Outlet } from "react-router";

export function meta() {
	return [{ title: "Samples — Adacta" }];
}

/**
 * Provides the page content selected within the samples section.
 */
export default function Samples() {
	return <Outlet />;
}
