/* eslint-disable @typescript-eslint/ban-types */

export interface IServiceContainerConfigurator<TContainer extends Record<string, object> = {}> {
	add<TName extends string, TRet>(
		name: TName,
		configure: (container: TContainer) => TRet
	): IServiceContainerConfigurator<
		TContainer & { [K in TName]: TRet extends PromiseLike<infer U> ? U : TRet }
	>;

	getInstance(): Promise<ServiceContainer<TContainer>>;
}

export class ServiceContainer<T extends Record<string, object> = {}> {
	private byId: T;
	private byType = new Map<Function, unknown[]>();

	public constructor(services: T) {
		this.byId = services;

		for (const service of Object.values(services)) {
			// Traverse the inheritance chain and add an entry for each parent type, so that a request for
			// a type will return all services whose types are further down the inheritance chain.
			// For example, say `ConcreteClass` extends `AbstractClass`, then a request for a service of
			// type `AbstractClass` should return an instance of `ConcreteClass`.
			let klass: Function | null = service.constructor;
			while (klass) {
				const serviceList = this.byType.get(klass);
				if (serviceList) {
					serviceList.push(service);
				} else {
					this.byType.set(klass, [service]);
				}
				// At the end of the prototype chain, `klass` will be null
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				klass = Object.getPrototypeOf(klass);
			}
		}
	}

	static configure(): IServiceContainerConfigurator {
		type IServices = Record<string, object>;

		const serviceConfigurators: {
			serviceId: string;
			configure: (container: IServices) => Promise<object> | object;
		}[] = [];

		return {
			add(serviceId: string, configure: (arg: any) => any): any {
				serviceConfigurators.push({ serviceId, configure });
				return this;
			},

			async getInstance(): Promise<ServiceContainer<IServices>> {
				const services: IServices = {};

				for (const { serviceId, configure } of serviceConfigurators) {
					services[serviceId] = await configure(services);
				}

				return new ServiceContainer(services);
			},
		};
	}

	get<K extends keyof T>(serviceId: K): T[K];
	get<T>(type: { new (...args: any[]): T }): T;
	get(service: Function | string): object {
		if (typeof service === "string") return this.byId[service];

		const list = this.byType.get(service);
		if (!list) {
			throw new Error(`Cannot resolve service for type "${service.name}": No such type defined.`);
		}
		if (list.length > 1) {
			throw new Error(
				`Cannot unambiguously resolve service for type "${service.name}": Multiple services of that type defined. Get the service based on its id instead.`
			);
		}

		return list[0] as T;
	}
}
