/**
 * Router integration point for the Catalyst kit.
 *
 * Catalyst ships this file rendering a plain <a>, with a TODO to swap in the
 * router's own link. Eight components import it (avatar, badge, button,
 * dropdown, navbar, sidebar, table, text), so without this every one of them
 * would trigger a full page reload instead of a client-side navigation.
 *
 * IMPORTANT: this is the one vendored file that is modified on purpose.
 * Re-apply it after upgrading the kit.
 *
 * https://catalyst.tailwindui.com/docs#client-side-router-integration
 */

import * as Headless from "@headlessui/react";
import React, { forwardRef } from "react";
import { Link as RouterLink } from "react-router";

export const Link = forwardRef(function Link(
	props: { href: string } & React.ComponentPropsWithoutRef<"a">,
	ref: React.ForwardedRef<HTMLAnchorElement>,
) {
	const { href, ...rest } = props;

	return (
		<Headless.DataInteractive>
			<RouterLink to={href} {...rest} ref={ref} />
		</Headless.DataInteractive>
	);
});
