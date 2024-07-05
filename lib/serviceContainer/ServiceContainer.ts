/* eslint-disable @typescript-eslint/ban-types */

import type { Constructor } from "type-fest";

export class ServiceContainer {
	private static global = new ServiceContainer(new Map());

	/**
	 * Holds the information on how to instantiate all known services.
	 *
	 * The key is the constructor of the service, and the value is either a factory function, an object with an array of
	 * dependencies, or an object with an array of descendents. The type of the value controls how the service is
	 * instantiated:
	 * If the value is a factory function, the service is instantiated by calling the function.
	 * In case the value is an object with a list of dependencies, the service's dependencies are known, and the service
	 * is instantiated by calling `new` on the constructor with the dependencies as arguments (after the dependencies
	 * have been instantiated recursively themselves).
	 * In case the value is an object with a list of descendents, the chain of descendents is traversed until a
	 * constructor with dependencies is found, and that service is instantiated as described above.
	 */
	private metadata: MetadataMap;

	private byType = new Map<Function, object[]>();

	constructor(metadata: MetadataMap = ServiceContainer.global.metadata) {
		this.metadata = metadata;
		this.set(this);
	}

	/**
	 * Configures how to instantiate a service. Services are always instantiated on demand using the `get` method.
	 * Use this method if you do not want or cannot use the `@Service` decorator, for example, when configuring
	 * classes from third-party libraries.
	 *
	 * @param Constructor - The constructor of the service to configure.
	 * @param factory - A factory function that returns an instance of the service.
	 */
	static configure<T>(Constructor: Constructor<T>, factory: () => T): void;

	/**
	 * Configures how to instantiate a service. Services are always instantiated on demand using the `get` method.
	 * Use this method if you do not want or cannot use the `@Service` decorator, for example, when configuring
	 * classes from third-party libraries.
	 *
	 * @param Constructor - The constructor of the service to configure.
	 * @param dependencyTypes - An array of constructors that represent the dependencies of the service.
	 */
	static configure<T, U extends AbstractConstructor<any>[]>(
		Constructor: Constructor<T, InstanceTypes<U>>,
		dependencyTypes: U
	): void;
	static configure<T, U extends AbstractConstructor<any>[]>(
		Constructor: Constructor<T, InstanceTypes<U>>,
		dependencyTypesOrFactory: U | (() => T)
	): void {
		return ServiceContainer.global.configure(Constructor, dependencyTypesOrFactory as U);
	}

	static get<T extends object>(Constructor: AbstractConstructor<T>): T {
		return ServiceContainer.global.get(Constructor);
	}

	static set<T extends object>(serviceInstance: T): T {
		return ServiceContainer.global.set(serviceInstance);
	}

	/**
	 * Clears all previously instantiated services.
	 */
	static reset() {
		const metadata = ServiceContainer.global.metadata;
		ServiceContainer.global = new ServiceContainer();
		ServiceContainer.global.metadata = metadata;
	}

	/**
	 * Configures how to instantiate a service. Services are always instantiated on demand using the `get` method.
	 * Use this method if you do not want or cannot use the `@Service` decorator, for example, when configuring
	 * classes from third-party libraries.
	 *
	 * @param Constructor - The constructor of the service to configure.
	 * @param factory - A factory function that returns an instance of the service.
	 */
	configure<T>(Constructor: Constructor<T>, factory: () => T): void;

	/**
	 * Configures how to instantiate a service. Services are always instantiated on demand using the `get` method.
	 * Use this method if you do not want or cannot use the `@Service` decorator, for example, when configuring
	 * classes from third-party libraries.
	 *
	 * @param Constructor - The constructor of the service to configure.
	 * @param dependencyTypes - An array of constructors that represent the dependencies of the service.
	 */
	configure<T, U extends AbstractConstructor<any>[]>(
		Constructor: Constructor<T, InstanceTypes<U>>,
		dependencyTypes: U
	): void;

	configure<T, U extends AbstractConstructor<any>[]>(
		Constructor: Constructor<T, InstanceTypes<U>>,
		dependencyTypesOrFactory: U | (() => T)
	): void {
		if (typeof dependencyTypesOrFactory === "function") {
			this.metadata.set(Constructor, dependencyTypesOrFactory);
		} else {
			this.metadata.set(Constructor, { dependencies: dependencyTypesOrFactory });
		}

		// At the end of the prototype chain, `Constructor` will be null
		let Class: AbstractConstructor<any> | null = Object.getPrototypeOf(
			Constructor
		) as AbstractConstructor<any> | null;

		while (Class) {
			let metadata = this.metadata.get(Class);

			if (!metadata) {
				metadata = { descendents: [] };
				this.metadata.set(Class, metadata);
			}

			if ("descendents" in metadata) {
				// Signal that the Constructor passed as an argument is a descendent of the current parent class
				metadata.descendents.push(Constructor);
			}

			Class = Object.getPrototypeOf(Class) as AbstractConstructor<any> | null;
		}
	}

	get<T extends object>(ServiceConstructor: AbstractConstructor<T>): T {
		const services = this.byType.get(ServiceConstructor);

		if (!services) {
			const metadata = this.metadata.get(ServiceConstructor);
			if (!metadata) {
				throw new ServiceContainerError(
					`Could not determine dependencies of service "${ServiceConstructor.name}" while attempting to instantiate. Did you forget to decorate the class with @Service?`
				);
			}

			// A factory function exists to instantiate the service, so call it and save the result
			if (typeof metadata === "function") {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return this.set(metadata());
			}

			// Metadata exists to instantiate the service
			if ("dependencies" in metadata) {
				// Recursively instantiate the requested service's dependencies
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				const dependencyInstances = metadata.dependencies.map((dep) => this.get(dep));

				return this.set(new (ServiceConstructor as Constructor<T>)(...dependencyInstances));
			}

			// Cannot instantiate the service directly, so attempt to find a descendent service, meaning another class
			// that inherits from the requested service, and instantiate that instead.
			const descendents = metadata.descendents;

			if (descendents.length !== 1) {
				throw new Error(
					`Cannot unambiguously resolve service for type "${ServiceConstructor.name}".`
				);
			}

			return this.set(this.get(descendents[0] as Constructor<T>));
		}

		if (services.length > 1) {
			throw new Error(
				`Cannot unambiguously resolve service for type "${ServiceConstructor.name}": Multiple services of that type defined.`
			);
		}

		return services[0] as T;
	}

	set<T extends object>(serviceInstance: T): T {
		// Traverse the inheritance chain and add an entry for each parent type, so that a request for
		// a type will return all services whose types are further down the inheritance chain.
		// For example, say `ConcreteClass` extends `AbstractClass`, then a request for a service of
		// type `AbstractClass` should return an instance of `ConcreteClass`.
		let Constructor: Function | null = serviceInstance.constructor;

		// The instance specifically provided by the user overrides any other instances of the same type.
		this.byType.set(Constructor, [serviceInstance]);

		// At the end of the prototype chain, `Constructor` will be null
		Constructor = Object.getPrototypeOf(Constructor) as Function | null;

		while (Constructor) {
			let serviceList = this.byType.get(Constructor);
			if (!serviceList) {
				serviceList = [];
				this.byType.set(Constructor, serviceList);
			}

			// Important not to add the same instance twice because that would lead to an error indicating ambiguous
			// service instances for a given type.
			if (!serviceList.includes(serviceInstance)) serviceList.push(serviceInstance);

			Constructor = Object.getPrototypeOf(Constructor) as Function | null;
		}

		return serviceInstance;
	}

	/**
	 * Returns a new ServiceContainer instance with the same services as this one. The services themselves are not
	 * cloned, so the same instances will be returned by both containers. The returned container can be modified, i.e.
	 * through calls to `set()`, without affecting this one.
	 */
	clone(): ServiceContainer {
		const cloned = new ServiceContainer();
		cloned.byType = new Map(this.byType);
		cloned.metadata = new Map(this.metadata);
		return cloned;
	}
}

type MetadataMap = Map<
	AbstractConstructor<any>,
	| (() => any)
	| { dependencies: AbstractConstructor<any>[] }
	| { descendents: AbstractConstructor<any>[] }
>;

export function Service<T extends Array<AbstractConstructor<any>>>(...DependencyConstructors: T) {
	return function decorator(ServiceConstructor: new (...args: InstanceTypes<T>) => any) {
		ServiceContainer.configure(ServiceConstructor, DependencyConstructors);
	};
}

class ServiceContainerError extends Error {
	constructor(message: string) {
		super(`ServiceContainer: ${message}`);
	}
}

type AbstractConstructor<T, TArguments extends unknown[] = any[]> = abstract new (
	...arguments_: TArguments
) => T;

type InstanceTypes<T extends [...any[]]> = {
	[Index in keyof T]: T[Index] extends AbstractConstructor<infer U> ? U : T[Index];
};
