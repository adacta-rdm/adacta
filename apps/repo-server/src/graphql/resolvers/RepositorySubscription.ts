import type { IRepositorySubscriptionResolvers } from "../generated/resolvers";

export const RepositorySubscription: IRepositorySubscriptionResolvers = {
	latestNotification: {
		subscribe: (_, __, { services: { uiSubscriptionPublisher } }) => {
			return uiSubscriptionPublisher.subscribeAsyncIterable("latestNotification");
		},
	},

	downsampleDataBecameReady: {
		subscribe: (_, __, { services: { uiSubscriptionPublisher } }) => {
			return uiSubscriptionPublisher.subscribeAsyncIterable("downsampleDataBecameReady");
		},
	},

	importTask: {
		subscribe: (_, __, { services: { uiSubscriptionPublisher } }) => {
			return uiSubscriptionPublisher.subscribeAsyncIterable("importTask");
		},
	},

	sampleAddedOrUpdated: {
		subscribe: (_, __, { services: { uiSubscriptionPublisher } }) => {
			return uiSubscriptionPublisher.subscribeAsyncIterable("sampleAddedOrUpdated");
		},
	},

	deviceAddedOrUpdated: {
		subscribe: (_, __, { services: { uiSubscriptionPublisher } }) => {
			return uiSubscriptionPublisher.subscribeAsyncIterable("deviceAddedOrUpdated");
		},
	},

	resourceAddedOrUpdated: {
		subscribe: (_, __, { services: { uiSubscriptionPublisher } }) => {
			return uiSubscriptionPublisher.subscribeAsyncIterable("resourceAddedOrUpdated");
		},
	},

	removedNode: {
		subscribe: (_, __, { services: { uiSubscriptionPublisher } }) => {
			return uiSubscriptionPublisher.subscribeAsyncIterable("removedNode");
		},
	},
};
