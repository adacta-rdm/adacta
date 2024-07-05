interface IConnection<T> {
	readonly edges: readonly {
		readonly node: T;
	}[];
}

type ExtractNodeType<T> = T extends IConnection<infer U> ? U : never;

export function connectionToArray<T extends IConnection<TNode>, TNode = ExtractNodeType<T>>(
	data: T
): TNode[] {
	return data.edges.map((e) => e.node);
}
