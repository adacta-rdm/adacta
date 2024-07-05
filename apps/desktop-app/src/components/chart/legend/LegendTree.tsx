import React from "react";

interface ILegendTreeNode {
	id: string;
	label: JSX.Element;
	children?: ILegendTreeNode[];
}

interface IProps {
	items: ILegendTreeNode[];
}

export function LegendTree(props: IProps) {
	return (
		<ul>
			{props.items.map((n) => (
				<li key={n.id}>
					{n.label}
					{n.children && n.children?.length > 0 && (
						<ul>
							<li onClick={() => {}}>
								<LegendTree items={n.children} />
							</li>
						</ul>
					)}
				</li>
			))}
		</ul>
	);
}
