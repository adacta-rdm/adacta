import type { Meta, StoryObj } from "@storybook/react";
import type { ComponentProps, ComponentType } from "react";
import type { OperationType } from "relay-runtime";

import type { IWithRouterParameters } from "~/.storybook/found/withRouter";
import type { IWithRelayParameters } from "~/.storybook/relay/withRelay";
import type { WithServicesParameters } from "~/.storybook/services/withServices";

export type AdactaStoryObj<
	T extends { component: ComponentType<any> },
	TQuery extends OperationType = OperationType
> = Omit<StoryObj<T>, "args"> & {
	parameters?: {
		services?: WithServicesParameters;
		router?: IWithRouterParameters;
		relay?: IWithRelayParameters<T, TQuery>;
	};
	args?: Partial<ComponentProps<T["component"]>>;
};

export type AdactaStoryMeta<
	T extends ComponentType<any>,
	TQuery extends OperationType = OperationType
> = Meta<T> & {
	parameters: {
		services?: WithServicesParameters;
		router?: IWithRouterParameters;
		relay?: IWithRelayParameters<{ component: T }, TQuery>;
	};
};
