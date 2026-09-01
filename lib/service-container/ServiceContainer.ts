/* eslint-disable @typescript-eslint/ban-types */

/**
 * @file A small dependency-injection container.
 *
 * The container maps a service type to an instance of that type. A service
 * type is its constructor. Instances are resolved on demand. Three principles
 * govern the behavior:
 *
 *   - Lazy instantiation. Registering a service records only how to build it.
 *     That is a factory, or a constructor together with the types of its
 *     dependencies. Nothing is built until `get` first asks for that type. The
 *     dependencies are then resolved one after another. The instance is cached.
 *     Each type is therefore built at most once per container.
 *
 *   - Resolution by type, along the inheritance chain. Registering an instance
 *     records it under its own constructor. It is also recorded under every
 *     ancestor constructor. A request for a base type therefore returns the
 *     concrete subclass registered for it. Such a base type is usually an
 *     abstract class used as an injection token. The match must be
 *     unambiguous. `get` throws when two instances answer to one requested
 *     type.
 *
 *   - A process-wide default, with scopes that cost little. The static
 *     `configure`, `get`, and `set` act on one global container. The whole
 *     process shares that container. `clone` derives an independent container.
 *     The clone shares the same service instances. It can be reconfigured on
 *     its own. This is how a caller obtains a scope, for example one scope per
 *     request. Overrides made in that scope do not reach the global container.
 *
 * A clone copies the current instances and parameters. Later changes therefore
 * stay local to that scope. Metadata is resolved through the parent chain
 * instead of being copied. Decorators register services when their modules are
 * evaluated. That may happen after a clone was created. Local metadata takes
 * precedence over metadata inherited from a parent.
 *
 * Services are usually registered with the `@Service(...deps)` decorator. The
 * decorator calls `configure` with the dependency types. `configure` is the
 * imperative equivalent. It is used for a type that cannot carry a decorator,
 * such as a third-party class. It is also used for a type that needs a
 * hand-written factory.
 */

import type { Constructor } from "type-fest";

/**
 * Brand identifying a `Parameter` token at runtime. Present on the token object so
 * `isParameter` can distinguish a parameter from a service constructor in a
 * dependency list without inspecting the value it holds.
 */
const PARAMETER = Symbol("ServiceContainer.parameter");
const SERVICE_FACTORY = Symbol("ServiceContainer.serviceFactory");

type FactoryService<T extends object, TArguments extends unknown[] = any[]> = ((
	...arguments_: TArguments
) => T) & {
	readonly [SERVICE_FACTORY]: true;
};

type ServiceKey<T extends object> = AbstractConstructor<T> | FactoryService<T>;

function isFactoryService(value: unknown): value is FactoryService<object> {
	return typeof value === "function" && SERVICE_FACTORY in value;
}

/**
 * A typed key for a container parameter. A parameter is a value the container
 * holds that is not a service. For example a number, a value bundle with no
 * constructor, an interface, or a third-party instance built by a factory.
 *
 * The token carries its value type `T` in the `_type` field. That field exists
 * only at the type level and is never assigned. It lets `getParameter(token)`
 * infer `T` without a cast at the call site.
 *
 * Tokens are compared by object identity. Define each one once as a shared
 * constant and import it. See `parameter`. A token is never rebuilt at a call
 * site.
 */
export interface Parameter<T> {
	readonly [PARAMETER]: true;
	/**
	 * A label read by a person. It appears only in "not set" error messages. The
	 * map key is the identity of the token. Two tokens with the same description
	 * are therefore still distinct.
	 */
	readonly description: string;
	readonly _type?: T;
}

/**
 * Create a parameter token carrying value type `T`. The explicit `T` is given
 * once, here at the definition. For example `const Repo =
 * parameter<string>("repo")`. No read site then needs a type argument.
 * `description` appears only in error messages.
 */
export function parameter<T>(description: string): Parameter<T> {
	return { [PARAMETER]: true, description };
}

/**
 * Narrow a dependency-list element to a parameter token. Used during resolution to
 * decide whether an element names a parameter value or a service constructor.
 */
function isParameter(value: unknown): value is Parameter<unknown> {
	return typeof value === "object" && value !== null && PARAMETER in value;
}

export class ServiceContainer {
	private static global: ServiceContainer = new ServiceContainer();

	/**
	 * Holds the information on how to instantiate all known services.
	 *
	 * The key is the constructor of the service. The value says how to build it.
	 * There are three kinds of value.
	 *
	 * A factory function is called. Its result is the service.
	 *
	 * An object with a list of dependencies names the types the constructor
	 * needs. Those dependencies are built first. The constructor is then called
	 * with them as arguments.
	 *
	 * An object with a list of descendents names the classes that inherit from
	 * this type. The chain is followed until a constructor with dependencies is
	 * found. That service is then built as described above.
	 *
	 * Each container stores only its own registrations in this table. `findMetadata`
	 * searches the parent chain when an entry is not available locally.
	 */
	private metadata: MetadataMap;

	/**
	 * The parent used for metadata lookup. Configuring this container does not
	 * change the parent. A local registration overrides the inherited one.
	 */
	private parent: ServiceContainer | undefined;

	private byType = new Map<Function, object[]>();

	/**
	 * Typed parameter values. They are injected into factories and into
	 * constructor dependency lists.
	 *
	 * A parameter carries no dependency graph. It is matched by exact token
	 * identity and not along an inheritance chain. Parameters therefore live in
	 * their own map. A parameter holds a value a service cannot hold. For
	 * example a number, a value bundle with no constructor, an interface, or a
	 * third-party instance built by a factory.
	 *
	 * The map is keyed by the `Parameter<T>` token. The token carries its own
	 * value type. `getParameter(token)` therefore returns `T` with no cast at
	 * the call site. The single `as T` inside `getParameter` is safe.
	 * `setParameter<T>` is the only writer and it enforces `value: T`. The read
	 * only recovers the type the token already guarantees.
	 *
	 * Keying by token identity rather than by a name is deliberate. Two tokens
	 * with the same description but a different `T` are distinct keys. A
	 * mismatched lookup therefore throws "not set". It does not return a value
	 * of the wrong type. Tokens are defined once as shared constants and
	 * imported.
	 */
	private parameters = new Map<Parameter<unknown>, unknown>();

	constructor() {
		this.metadata = new Map();

		// The global container is undefined while its own static initializer runs, making
		// that first container the root. Containers created later inherit global metadata.
		this.parent = ServiceContainer.global;

		this.set(this);
	}

	/**
	 * Return the nearest registration for `Service`, starting with this container and
	 * continuing through its parents. The first match defines the effective configuration.
	 */
	private findMetadata(Service: ServiceKey<any>): ServiceMetadata | undefined {
		return this.metadata.get(Service) ?? this.parent?.findMetadata(Service);
	}

	/**
	 * Configures how to instantiate a service. Services are always instantiated on demand using the `get` method.
	 * Use this method if you do not want or cannot use the `@Service` decorator, for example, when configuring
	 * classes from third-party libraries.
	 *
	 * @param Constructor - The constructor of the service to configure.
	 * @param factory - A factory function that returns an instance of the service.
	 */
	static configure<T extends object>(
		Constructor: Constructor<T> | AbstractConstructor<T>,
		factory: (container: ServiceContainer) => T,
	): void;

	/**
	 * Configures how to instantiate a service. Services are always instantiated on demand using the `get` method.
	 * Use this method if you do not want or cannot use the `@Service` decorator, for example, when configuring
	 * classes from third-party libraries.
	 *
	 * @param Constructor - The constructor of the service to configure.
	 * @param dependencyTypes - An array of dependencies: service constructors, and/or parameter tokens
	 *   whose stored values are injected. The tuple's shape must match the constructor's argument types.
	 */
	static configure<T extends object, U extends Dependency[]>(
		Constructor: Constructor<T, InstanceTypes<U>>,
		dependencyTypes: U,
	): void;
	static configure<T extends object, U extends Dependency[]>(
		Factory: FactoryService<T, InstanceTypes<U>>,
		dependencyTypes: U,
	): void;
	static configure<T extends object, U extends Dependency[]>(
		Service: ServiceKey<T>,
		dependencyTypesOrFactory: U | ((container: ServiceContainer) => T),
	): void {
		return ServiceContainer.global.configureService(Service, dependencyTypesOrFactory);
	}

	/**
	 * Resolve the instance registered for `Constructor` on the global container,
	 * instantiating it and its dependencies on first request. See the instance
	 * method of the same name for the resolution rules.
	 */
	static get<T extends object>(Service: ServiceKey<T>): T {
		return ServiceContainer.global.get(Service);
	}

	/**
	 * Register an instance on the global container. A single argument derives class
	 * keys from the instance; a factory-service key may be supplied explicitly for
	 * plain-object factory results. See the instance method of the same name.
	 */
	static set<T extends object>(serviceInstance: T): T;
	static set<T extends object>(Factory: FactoryService<T>, serviceInstance: T): T;
	static set<T extends object>(FactoryOrInstance: FactoryService<T> | T, serviceInstance?: T): T {
		return serviceInstance === undefined
			? ServiceContainer.global.set(FactoryOrInstance as T)
			: ServiceContainer.global.set(FactoryOrInstance as FactoryService<T>, serviceInstance);
	}

	/**
	 * Set a parameter on the global container. Parameters live alongside services and
	 * may be set process-wide here or per-scope on a `clone`. See the instance method
	 * of the same name.
	 */
	static setParameter<T>(param: Parameter<T>, value: T): void {
		ServiceContainer.global.setParameter(param, value);
	}

	/**
	 * Resolve a parameter from the global container. See the instance method of the
	 * same name.
	 */
	static getParameter<T>(param: Parameter<T>): T {
		return ServiceContainer.global.getParameter(param);
	}

	/**
	 * Discard every built service on the global container. The registrations are
	 * kept. Each service is therefore built again on the next `get`. This keeps
	 * one test from seeing the services of another.
	 */
	static reset() {
		const metadata = ServiceContainer.global.metadata;
		const fresh = new ServiceContainer();

		// The registrations are kept. The cached instances and parameters are
		// discarded. Construction assigns the old global as parent. That parent is
		// cleared here. The new global therefore stays a root.
		fresh.metadata = metadata;
		fresh.parent = undefined;

		ServiceContainer.global = fresh;
	}

	/**
	 * Derive an independent container from the process-wide global one. The clone
	 * shares the global container's service instances and registrations but can be
	 * reconfigured through `configure`/`set` without affecting the global container.
	 * This is the basis for a scoped container, for example one established per
	 * request and carried in that request's context.
	 */
	static clone(): ServiceContainer {
		return ServiceContainer.global.clone();
	}

	/**
	 * Configures how to instantiate a service. Services are always instantiated on demand using the `get` method.
	 * Use this method if you do not want or cannot use the `@Service` decorator, for example, when configuring
	 * classes from third-party libraries.
	 *
	 * @param Constructor - The constructor of the service to configure.
	 * @param factory - A factory function that returns an instance of the service.
	 */
	configure<T extends object>(
		Constructor: Constructor<T>,
		factory: (container: ServiceContainer) => T,
	): void;

	/**
	 * Configures how to instantiate a service. Services are always instantiated on demand using the `get` method.
	 * Use this method if you do not want or cannot use the `@Service` decorator, for example, when configuring
	 * classes from third-party libraries.
	 *
	 * @param Constructor - The constructor of the service to configure.
	 * @param dependencyTypes - An array of dependencies: service constructors, and/or parameter tokens
	 *   whose stored values are injected. The tuple's shape must match the constructor's argument types.
	 */
	configure<T extends object, U extends Dependency[]>(
		Constructor: Constructor<T, InstanceTypes<U>>,
		dependencyTypes: U,
	): void;
	configure<T extends object, U extends Dependency[]>(
		Factory: FactoryService<T, InstanceTypes<U>>,
		dependencyTypes: U,
	): void;

	configure<T extends object, U extends Dependency[]>(
		Service: ServiceKey<T>,
		dependencyTypesOrFactory: U | ((container: ServiceContainer) => T),
	): void {
		this.configureService(Service, dependencyTypesOrFactory);
	}

	private configureService(
		Service: ServiceKey<any>,
		dependencyTypesOrFactory: Dependency[] | ((container: ServiceContainer) => object),
	): void {
		if (typeof dependencyTypesOrFactory === "function") {
			this.metadata.set(Service, dependencyTypesOrFactory);
		} else {
			this.metadata.set(Service, { dependencies: dependencyTypesOrFactory });
		}

		// Factory services use their function identity as an exact key; unlike
		// constructors, their JavaScript prototype chain does not describe service
		// inheritance.
		if (isFactoryService(Service)) return;
		const Constructor = Service as AbstractConstructor<any>;

		// At the end of the prototype chain, `Constructor` will be null
		let Class: AbstractConstructor<any> | null = Object.getPrototypeOf(
			Constructor,
		) as AbstractConstructor<any> | null;

		while (Class) {
			let metadata = this.metadata.get(Class);

			if (!metadata) {
				const inherited = this.findMetadata(Class);

				if (inherited && !("descendents" in inherited)) {
					// An ancestor with its own construction rule keeps no list of concrete
					// descendants. There is therefore nothing to extend at this level.
					Class = Object.getPrototypeOf(Class) as AbstractConstructor<any> | null;
					continue;
				}

				// An inherited descendant list belongs to the parent. Copy it before adding the
				// local registration so configuration does not leak into the parent container.
				metadata = { descendents: inherited ? [...inherited.descendents] : [] };
				this.metadata.set(Class, metadata);
			}

			if ("descendents" in metadata) {
				// Signal that the Constructor passed as an argument is a descendent of the current parent class
				metadata.descendents.push(Constructor);
			}

			Class = Object.getPrototypeOf(Class) as AbstractConstructor<any> | null;
		}
	}

	/**
	 * Resolve the single instance registered for `ServiceConstructor`.
	 *
	 * On the first request the instance is built. It is built from its registered
	 * factory, or by calling the constructor with its dependencies resolved
	 * first. The result is cached.
	 *
	 * This throws when the type was never registered. A missing `@Service`
	 * decorator is the usual cause. It also throws when more than one instance
	 * answers to the requested type.
	 */
	get<T extends object>(ServiceConstructor: ServiceKey<T>): T;

	/**
	 * Resolve the instances registered for each supplied service key. The returned
	 * tuple preserves the keys' order and maps each key to its service's instance
	 * type. At least two keys are required; use the single-key overload otherwise.
	 */
	get<T extends [ServiceKey<object>, ServiceKey<object>, ...ServiceKey<object>[]]>(
		...ServiceConstructors: T
	): InstanceTypes<T>;
	get<T extends object>(...ServiceConstructors: ServiceKey<T>[]): T | T[] {
		if (ServiceConstructors.length > 1) {
			return ServiceConstructors.map((ServiceConstructor) => this.get(ServiceConstructor));
		}

		const [ServiceConstructor] = ServiceConstructors;
		const services = this.byType.get(ServiceConstructor);

		if (!services) {
			const metadata = this.findMetadata(ServiceConstructor);
			if (!metadata) {
				throw new ServiceNotConfiguredError(ServiceConstructor);
			}

			// A factory function exists for this service. It is called here and its
			// result is saved. The factory receives this container. It can then read
			// parameters with container.getParameter(token). It can also resolve other
			// services against the same container. That container may be a scoped one.
			if (typeof metadata === "function") {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return this.set(metadata(this));
			}

			// Metadata exists to instantiate the service
			if ("dependencies" in metadata) {
				// Recursively resolve the requested service's dependencies. A parameter token yields its
				// stored value; anything else is a service constructor resolved as usual.
				const dependencyInstances = metadata.dependencies.map((dep) =>
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					isParameter(dep) ? this.getParameter(dep) : this.get(dep),
				);

				if (isFactoryService(ServiceConstructor)) {
					const instance = ServiceConstructor(...dependencyInstances);
					this.byType.set(ServiceConstructor, [instance]);
					return instance as T;
				}

				return this.set(new (ServiceConstructor as Constructor<T>)(...dependencyInstances));
			}

			// The service cannot be built directly. A descendent service is looked up
			// instead. A descendent is another class that inherits from the requested
			// service. That class is then built.
			const descendents = metadata.descendents;

			if (descendents.length === 0) {
				throw new ServiceImplementationNotFoundError(ServiceConstructor);
			}

			if (descendents.length > 1) {
				throw new MultipleServiceImplementationsError(ServiceConstructor, descendents);
			}

			return this.set(this.get(descendents[0] as Constructor<T>));
		}

		if (services.length > 1) {
			throw new MultipleServiceInstancesError(ServiceConstructor, services);
		}

		return services[0] as T;
	}

	/**
	 * Register an instance in this container and return it.
	 *
	 * With one argument, the instance is registered under its constructor and every
	 * ancestor constructor. With two arguments, a factory service is the exact key;
	 * this supports plain-object replacements such as test doubles whose constructor
	 * cannot identify the factory service they replace.
	 */
	set<T extends object>(serviceInstance: T): T;
	set<T extends object>(Factory: FactoryService<T>, serviceInstance: T): T;
	set<T extends object>(FactoryOrInstance: FactoryService<T> | T, keyedInstance?: T): T {
		if (keyedInstance !== undefined) {
			this.byType.set(FactoryOrInstance as FactoryService<T>, [keyedInstance]);
			return keyedInstance;
		}

		const serviceInstance = FactoryOrInstance as T;
		// The inheritance chain is walked and an entry is added for each parent type.
		// A request for a type then returns every service further down the chain.
		// For example, say `ConcreteClass` extends `AbstractClass`, then a request for a service of
		// type `AbstractClass` should return an instance of `ConcreteClass`.
		let Constructor: Function | null = serviceInstance.constructor;

		// If there is exactly one previously-registered instance for the concrete constructor,
		// remove that single old instance from all type mappings in `byType`.
		//
		// Rationale:
		// - When a user provides a new instance for a concrete class via `set()`, the new instance
		//   should override any previously-registered instance of the same concrete type.
		// - Parent-type mappings (entries for superclasses/interfaces) may still hold references to
		//   the old instance; leaving those would cause ambiguous lookups or stale references.
		//
		// Behavior notes:
		// - The cleanup runs only when exactly one instance was previously registered for the
		//   concrete constructor. If multiple instances already exist for that constructor we do
		//   not perform the global removal (to avoid unexpectedly removing instances in ambiguous
		//   scenarios).

		const oldServices = this.byType.get(Constructor);
		if (oldServices && oldServices.length === 1) {
			for (const [key, value] of this.byType) {
				this.byType.set(
					key,
					value.filter((instance) => instance !== oldServices[0]),
				);
			}
		}

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
	 * Register `value` under the token `param`. The value can then be injected
	 * wherever the token appears in a dependency list. It can also be read
	 * through `getParameter`. Setting the same token again overwrites the
	 * previous value. The value type is checked here against the token's `T`.
	 * `getParameter` can therefore return `T` without a cast.
	 *
	 * Like services, parameters may sit on the global container (a process-wide default)
	 * or on a `clone` (a per-request override); the clone copies the parent's parameters
	 * and its own writes do not leak back.
	 */
	setParameter<T>(param: Parameter<T>, value: T): void {
		this.parameters.set(param, value);
	}

	/**
	 * Resolve the value registered for the token `param`.
	 *
	 * The return type is the token's `T`. The call site needs no generic argument
	 * and no cast. The token carries the type. The caller is therefore not asked
	 * to assert it. This throws when the token was never set on this container.
	 */
	getParameter<T>(param: Parameter<T>): T {
		if (!this.parameters.has(param)) {
			throw new ServiceParameterNotSetError(param);
		}
		// Sound by construction: `setParameter<T>` is the only writer and enforces `value: T`.
		return this.parameters.get(param) as T;
	}

	/**
	 * Return an independent copy of this container.
	 *
	 * The copy shares the same service instances. They are not built again. It
	 * shares the same registrations. Both are held in separate maps. `set`,
	 * `configure`, and `setParameter` on the copy therefore leave this container
	 * unchanged. This is how a scoped container is derived from another.
	 */
	clone(): ServiceContainer {
		const cloned = new ServiceContainer();

		// Existing service objects are intentionally shared. Copy each containing array because
		// `set` mutates these arrays when registering an instance under its ancestor types.
		cloned.byType = new Map(
			Array.from(this.byType, ([Service, instances]) => [Service, [...instances]]),
		);
		cloned.parameters = new Map(this.parameters);

		// Resolve metadata through the parent so registrations made after cloning remain visible.
		// Calls to `configure` still write locally and therefore override inherited metadata.
		cloned.parent = this;

		return cloned;
	}
}

/**
 * A single entry in a service's dependency list. It is either another service,
 * named by its constructor, or a parameter token whose stored value is
 * injected. `InstanceTypes` maps a constructor to its instance type and a
 * `Parameter<V>` to `V`. The tuple is therefore checked against the argument
 * types of the service constructor.
 */
type Dependency = AbstractConstructor<any> | FactoryService<any> | Parameter<unknown>;

/**
 * Describes how to resolve a service: call a factory, invoke a constructor with its
 * dependencies, or select a concrete descendant for an abstract service key.
 */
type ServiceMetadata =
	| ((container: ServiceContainer) => any)
	| { dependencies: Dependency[] }
	| { descendents: AbstractConstructor<any>[] };

type MetadataMap = Map<ServiceKey<any>, ServiceMetadata>;

/**
 * Register a class as a lazily constructed service.
 *
 * The decorator records the listed service constructors, factory services, and
 * parameter tokens as constructor dependencies. `ServiceContainer.get()`
 * resolves them in order. It then calls the constructor once per container
 * scope and caches the instance. Applying the decorator registers the class at
 * once. It does not build it.
 *
 * @example
 * ```ts
 * const RepositoryName = parameter<string>("repo")
 *
 * @Service(DatabaseConnection, RepositoryName)
 * class Repository {
 *   constructor(connection: DatabaseConnection, repo: string) {}
 * }
 * ```
 */
export function Service<T extends Array<Dependency>>(...dependencies: T) {
	return function decorator(ServiceConstructor: new (...args: InstanceTypes<T>) => any) {
		ServiceContainer.configure(ServiceConstructor, dependencies);
	};
}

/**
 * Register a function as a lazily created service and return that same function.
 *
 * Dependencies are declared in the first call and are passed to the factory in
 * the same order when `ServiceContainer.get()` first resolves it. The factory
 * function itself is the service key. Independent factories may therefore
 * return plain objects without colliding. The result is cached once per
 * container scope.
 * Calling the returned function directly remains possible but bypasses the
 * container and its cache.
 *
 * Registration is a side effect of the second call; the factory is not executed
 * until the service is resolved.
 *
 * @example
 * ```ts
 * const Auth = service(DatabaseConnection, AppConfig)(
 *   (database, config) => createAuth(database, config),
 * );
 *
 * const auth = ServiceContainer.get(Auth);
 * ```
 */
export function service<T extends Array<Dependency>>(...dependencies: T) {
	return function registerFactory<TFactory extends (...dependencies: InstanceTypes<T>) => object>(
		factory: TFactory,
	): TFactory & FactoryService<ReturnType<TFactory>, InstanceTypes<T>> {
		Object.defineProperty(factory, SERVICE_FACTORY, { value: true });
		const factoryService = factory as TFactory &
			FactoryService<ReturnType<TFactory>, InstanceTypes<T>>;
		ServiceContainer.configure(factoryService, dependencies);
		return factoryService;
	};
}

/**
 * Base class for errors raised by service-container configuration and resolution.
 */
export class ServiceContainerError extends Error {
	constructor(message: string) {
		super(`ServiceContainer: ${message}`);
		this.name = new.target.name;
	}
}

/**
 * Thrown when a service has no factory or dependency metadata. The `service` property
 * identifies the key that must be configured before it can be resolved.
 */
export class ServiceNotConfiguredError extends ServiceContainerError {
	constructor(public readonly service: ServiceKey<any>) {
		super(
			`Could not determine dependencies of service "${service.name}" while attempting to instantiate. Did you forget to decorate the class with @Service?`,
		);
	}
}

/**
 * Thrown when a requested parameter has no value in the container. The `parameter`
 * property contains the original token and its human-readable description.
 */
export class ServiceParameterNotSetError extends ServiceContainerError {
	constructor(public readonly parameter: Parameter<unknown>) {
		super(`No parameter "${parameter.description}" set on this container.`);
	}
}

/**
 * Thrown when an abstract service key has no registered concrete implementation. The
 * `service` property identifies the unresolved abstract type.
 */
export class ServiceImplementationNotFoundError extends ServiceContainerError {
	constructor(public readonly service: ServiceKey<any>) {
		super(`Cannot unambiguously resolve service for type "${service.name}".`);
	}
}

/**
 * Thrown when several concrete types are registered for the same service key. The
 * `implementations` property contains a copy of the conflicting constructors.
 */
export class MultipleServiceImplementationsError extends ServiceContainerError {
	public readonly implementations: readonly AbstractConstructor<any>[];

	constructor(
		public readonly service: ServiceKey<any>,
		implementations: readonly AbstractConstructor<any>[],
	) {
		super(`Cannot unambiguously resolve service for type "${service.name}".`);
		this.implementations = [...implementations];
	}
}

/**
 * Thrown when several cached instances match the requested service key. The `instances`
 * property contains a copy of the conflicting instances.
 */
export class MultipleServiceInstancesError extends ServiceContainerError {
	public readonly instances: readonly object[];

	constructor(
		public readonly service: ServiceKey<any>,
		instances: readonly object[],
	) {
		super(
			`Cannot unambiguously resolve service for type "${service.name}": Multiple services of that type defined.`,
		);
		this.instances = [...instances];
	}
}

type AbstractConstructor<T, TArguments extends unknown[] = any[]> = abstract new (
	...arguments_: TArguments
) => T;

type InstanceTypes<T extends [...any[]]> = {
	// A constructor element resolves to its instance type; a parameter token resolves
	// to the value type it carries. The order matters: `Parameter<V>` is an object type,
	// so it must be matched before any structural fallthrough.
	[Index in keyof T]: T[Index] extends AbstractConstructor<infer U>
		? U
		: T[Index] extends Parameter<infer V>
			? V
			: T[Index] extends FactoryService<infer U>
				? U
				: T[Index];
};
