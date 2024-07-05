import { createPubSub } from "graphql-yoga";

import type { IRepositorySubscription } from "../generated/resolvers";

import { Service } from "~/lib/serviceContainer/ServiceContainer";
import type { ResolverReturnType } from "~/lib/utils/types";

type ValidSubscriptions = keyof Omit<IRepositorySubscription, "__typename">;

@Service()
export class SubscriptionPublisher {
	private pubSub = createPubSub();

	publish<T extends ValidSubscriptions>(
		subscriptionName: T,
		payload: ResolverReturnType<IRepositorySubscription[T]>
	) {
		this.pubSub.publish(subscriptionName, {
			[subscriptionName]: payload,
		});
	}

	subscribeAsyncIterable<T>(subscriptionName: ValidSubscriptions): AsyncIterable<T> {
		return this.pubSub.subscribe(subscriptionName);
	}
}
