import * as React from "react";
import { useCallback } from "react";

import { useRouter } from "../hooks/useRouter";
import type { RouterArgs } from "../routes";

interface ILinkProps extends React.ComponentProps<"a"> {
	to: RouterArgs;
}

export function Link(props: ILinkProps) {
	const { router } = useRouter();
	const { to, onClick, ...rest } = props;
	const handleClick = useCallback(
		(arg: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
			router.push(...to);
			if (onClick) {
				onClick(arg);
			}
		},
		[router, onClick, to]
	);

	return <a {...rest} onClick={handleClick}></a>;
}
