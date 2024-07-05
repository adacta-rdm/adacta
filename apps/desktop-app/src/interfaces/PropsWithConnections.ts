interface IConnections {
	/**
	 * An array of connection IDs that will be updated in response to a mutation/subscription.
	 * Connection IDs can be obtained either by using the __id field on connections or using the
	 * ConnectionHandler.getConnectionID API.
	 * Usually used as arguments for:
	 *  - @appendEdge / @appendNode
	 *  - @prependEdge / @prependNode
	 *  - @deleteEdge
	 * to update the relay store entry of the connection identified by that connection ID.
	 */
	connections: string[];
}

export type PropsWithConnections<TProps, TNullable = false> = TProps &
	(TNullable extends true ? Partial<IConnections> : IConnections);
