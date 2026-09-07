import {
	afterEach,
	beforeEach,
	describe,
	expect,
	expectTypeOf,
	mock,
	test,
	type Mock,
} from "bun:test";

import {
	MultipleServiceInstancesError,
	parameter,
	service,
	Service,
	ServiceContainer,
	ServiceNotConfiguredError,
} from "../ServiceContainer.ts";

describe("ServiceContainer", () => {
	let spyA: Mock<() => void>;
	beforeEach(() => {
		spyA = mock<() => void>();
	});

	afterEach(() => ServiceContainer.reset());

	@Service()
	class A {
		constructor() {
			// Calling a mock here is easier than spying on the constructor, which
			// needs extra machinery.
			spyA();
		}
	}

	test("calls constructor to instantiate the class", () => {
		const a = ServiceContainer.get(A);

		expect(a).toBeInstanceOf(A);
		expect(spyA).toHaveBeenCalledTimes(1);
	});

	test("instance created with 'new' can instantiate services declared using Service decorator", () => {
		const sc = new ServiceContainer();
		const a = sc.get(A);

		expect(a).toBeInstanceOf(A);
		expect(spyA).toHaveBeenCalledTimes(1);
	});

	test("resolves multiple services in argument order", () => {
		@Service(A)
		class B {
			constructor(public a: A) {}
		}

		const sc = new ServiceContainer();
		const [b, a] = sc.get(B, A);

		expectTypeOf(b).toEqualTypeOf<B>();
		expectTypeOf(a).toEqualTypeOf<A>();
		expect(b).toBeInstanceOf(B);
		expect(a).toBeInstanceOf(A);
		expect(b.a).toBe(a);
	});

	test("calls constructor of dependency to instantiate the class", () => {
		@Service(A)
		class B {
			constructor(public a: A) {}
		}

		const b = ServiceContainer.get(B);

		expect(b).toBeInstanceOf(B);
		expect(b.a).toBeInstanceOf(A);
		expect(spyA).toHaveBeenCalledTimes(1);
	});

	test("traverses prototype chain to resolve dependency", () => {
		class B {
			constructor(public stringArg: string) {}
		}
		class C extends B {}
		ServiceContainer.set(new C("C"));

		const b = ServiceContainer.get(B);
		expect(b).toBeInstanceOf(C);
		expect(b.stringArg).toBe("C");
	});

	test("abstract classes with @Service decorator", () => {
		abstract class AbstractClass {
			abstract method1(): void;
		}

		class ConcreteClass extends AbstractClass {
			// eslint-disable-next-line class-methods-use-this
			method1() {}
		}

		@Service(AbstractClass)
		class AnotherService {
			constructor(public dep: AbstractClass) {}
		}

		ServiceContainer.set(new ConcreteClass());
		const a = ServiceContainer.get(AnotherService);

		expect(a).toBeInstanceOf(AnotherService);
		expect(a.dep).toBeInstanceOf(ConcreteClass);
	});

	test("returns the most recently set instance for concrete class and its abstract base", () => {
		abstract class AbstractClass {
			abstract method1(): void;
		}

		class ConcreteClass extends AbstractClass {
			// eslint-disable-next-line class-methods-use-this
			method1() {}
		}

		const b1 = new ConcreteClass();
		const b2 = new ConcreteClass();

		ServiceContainer.set(b1);
		ServiceContainer.set(b2);

		expect(ServiceContainer.get(ConcreteClass)).toBe(b2);
		expect(ServiceContainer.get(AbstractClass)).toBe(b2);
	});

	test("can get a concrete instance of an abstract class without it having been set before", () => {
		abstract class AbstractClass {
			abstract method1(): void;
		}

		class ConcreteClass extends AbstractClass {
			// eslint-disable-next-line class-methods-use-this
			method1() {}
		}

		ServiceContainer.configure(ConcreteClass, []);
		const instance = ServiceContainer.get(AbstractClass);

		expect(instance).toBeInstanceOf(ConcreteClass);
		// Instances must be identical!
		expect(ServiceContainer.get(ConcreteClass)).toBe(instance);
		expect(ServiceContainer.get(AbstractClass)).toBe(instance);
	});

	test("can get an instance of ServiceContainer", () => {
		expect(ServiceContainer.get(ServiceContainer)).toBeInstanceOf(ServiceContainer);
	});

	test("clone returns a new ServiceContainer instance", () => {
		const root = ServiceContainer.get(ServiceContainer);
		const cloned = root.clone();

		expect(cloned).not.toBe(root);
	});

	test("clone returns a new independent ServiceContainer with the same services", () => {
		@Service(A)
		class B {
			constructor(public a: A) {}
		}

		const root = ServiceContainer.get(ServiceContainer);
		const rootA = root.get(A);

		const cloned = root.clone();
		const clonedA = cloned.get(A);

		// The instance of A was built before cloning. It must be the same instance.
		expect(rootA).toBe(clonedA);

		// The instance of B was built after cloning. It must be a different instance.
		const rootB = root.get(B);
		const clonedB = cloned.get(B);

		expect(rootB).not.toBe(clonedB);
	});

	test("setting a subclass instance on a clone does not alter the parent's base-class resolution", () => {
		abstract class Base {}
		class ParentImplementation extends Base {}
		class ScopedImplementation extends Base {}

		const root = new ServiceContainer();
		const parentInstance = root.set(new ParentImplementation());
		const scoped = root.clone();

		scoped.set(new ScopedImplementation());

		expect(root.get(Base)).toBe(parentInstance);
		expect(() => scoped.get(Base)).toThrow(MultipleServiceInstancesError);
	});

	// A clone may itself be cloned, placing a container several links below the global one.
	// Registration is a side effect of evaluating the declaring module and is therefore
	// unordered with respect to container creation. It may come before or after any
	// clone. It may occur at any link. Every such registration must remain reachable
	// from the innermost container. The nearest one must win.
	test("resolves a service registered globally after both clones were made", () => {
		const outer = ServiceContainer.clone();
		const inner = outer.clone();

		// The decorator always registers on the global container, two links up.
		@Service()
		class LateService {}

		expect(inner.get(LateService)).toBeInstanceOf(LateService);
	});

	test("resolves a service registered on the intermediate clone", () => {
		class Connection {
			constructor(public dsn: string) {}
		}

		const outer = ServiceContainer.clone();
		outer.configure(Connection, () => new Connection("outer"));
		const inner = outer.clone();

		// Reached through the intermediate link. The global container never learns about
		// this registration at all.
		expect(inner.get(Connection).dsn).toBe("outer");
		expect(() => ServiceContainer.get(Connection)).toThrow(/@Service/);
	});

	test("a registration on the intermediate clone shadows the global one", () => {
		@Service()
		class Clock {
			readonly scope = "global";
		}

		const outer = ServiceContainer.clone();
		outer.configure(Clock, () => ({ scope: "outer" }));
		const inner = outer.clone();

		expect(inner.get(Clock).scope).toBe("outer");
		expect(ServiceContainer.get(Clock).scope).toBe("global");
	});

	test("configure on a clone does not register the service on the parent", () => {
		class Scoped {}
		const root = new ServiceContainer();
		const scoped = root.clone();

		scoped.configure(Scoped, () => new Scoped());

		expect(scoped.get(Scoped)).toBeInstanceOf(Scoped);
		expect(() => root.get(Scoped)).toThrow(/@Service/);
	});

	test("registering a subclass on a clone does not make it resolvable from the parent", () => {
		abstract class Base {}
		const root = new ServiceContainer();
		const scoped = root.clone();

		class Derived extends Base {}
		scoped.configure(Derived, []);

		expect(scoped.get(Base)).toBeInstanceOf(Derived);
		expect(() => root.get(Base)).toThrow(/@Service/);
	});

	test("cloned ServiceContainer can override previously set services", () => {
		ServiceContainer.set(new A());
		const root = ServiceContainer.get(ServiceContainer);
		const cloned = root.clone();

		cloned.set(new A());

		expect(cloned.get(A)).not.toBe(root.get(A));
	});

	test("provide factory function to configure()", () => {
		class A {
			constructor(public str: string) {}
		}

		const factory = mock<() => A>(() => new A("test"));

		ServiceContainer.configure(A, factory);

		const instance = ServiceContainer.get(A);

		expect(instance).toBeInstanceOf(A);
		expect(instance.str).toBe("test");
		expect(factory).toHaveBeenCalledTimes(1);
	});

	test("supports initialization of abstract classes with configure", () => {
		abstract class AbstractClass {
			abstract method1(): void;
		}

		class ConcreteClass extends AbstractClass {
			// eslint-disable-next-line class-methods-use-this
			method1() {}
		}

		ServiceContainer.configure(AbstractClass, () => new ConcreteClass());
		const instance = ServiceContainer.get(AbstractClass);

		expect(instance).toBeInstanceOf(ConcreteClass);
		// Instances must be identical!
		expect(ServiceContainer.get(ConcreteClass)).toBe(instance);
		expect(ServiceContainer.get(AbstractClass)).toBe(instance);
	});

	describe("factory services", () => {
		test("returns and lazily registers the original factory function", () => {
			const factory = mock((a: A) => ({ a }));
			const FactoryService = service(A)(factory);

			expect(factory).toBe(FactoryService);
			expect(factory).not.toHaveBeenCalled();

			const instance = ServiceContainer.get(FactoryService);

			expectTypeOf(instance).toEqualTypeOf<{ a: A }>();
			expect(instance.a).toBeInstanceOf(A);
			expect(factory).toHaveBeenCalledTimes(1);
		});

		test("caches the result under the factory function", () => {
			const factory = mock(() => ({ value: "created" }));
			const FactoryService = service()(factory);

			const first = ServiceContainer.get(FactoryService);
			const second = ServiceContainer.get(FactoryService);

			expect(second).toBe(first);
			expect(factory).toHaveBeenCalledTimes(1);
		});

		test("keeps plain-object factory services distinct", () => {
			const First = service()(() => ({ value: "first" }));
			const Second = service()(() => ({ value: "second" }));

			expect(ServiceContainer.get(First).value).toBe("first");
			expect(ServiceContainer.get(Second).value).toBe("second");
		});

		test("can be injected into a constructor service", () => {
			const Config = service()(() => ({ url: "https://example.com" }));

			@Service(Config)
			class Client {
				constructor(readonly config: ReturnType<typeof Config>) {}
			}

			const client = ServiceContainer.get(Client);

			expect(client.config).toBe(ServiceContainer.get(Config));
			expect(client.config.url).toBe("https://example.com");
		});

		test("resolves parameter dependencies before calling the factory", () => {
			const Region = parameter<string>("region");
			const RegionalConfig = service(Region)((region: string) => ({ region }));
			const container = new ServiceContainer();
			container.setParameter(Region, "eu-central-1");

			expect(container.get(RegionalConfig).region).toBe("eu-central-1");
		});

		test("can replace a factory service by its key", () => {
			const factory = mock(() => ({ source: "real" }));
			const FactoryService = service()(factory);
			const replacement = { source: "replacement" };
			const container = new ServiceContainer();

			expect(container.set(FactoryService, replacement)).toBe(replacement);
			expect(container.get(FactoryService)).toBe(replacement);
			expect(factory).not.toHaveBeenCalled();
		});

		test("a keyed replacement is scoped to the cloned container", () => {
			const FactoryService = service()(() => ({ source: "real" }));
			const root = new ServiceContainer();
			const original = root.get(FactoryService);
			const scoped = root.clone();
			const replacement = { source: "replacement" };

			scoped.set(FactoryService, replacement);

			expect(scoped.get(FactoryService)).toBe(replacement);
			expect(root.get(FactoryService)).toBe(original);
		});
	});

	describe("parameters", () => {
		const Repo = parameter<string>("repo");

		test("setParameter/getParameter round-trips a scalar", () => {
			const sc = new ServiceContainer();
			sc.setParameter(Repo, "acme");

			expect(sc.getParameter(Repo)).toBe("acme");
		});

		test("getParameter throws when the token was never set", () => {
			expect(() => new ServiceContainer().getParameter(Repo)).toThrow(/parameter "repo"/);
		});

		test("holds a non-primitive value with its type recovered uncast", () => {
			const Config = parameter<{ retries: number; url: string }>("config");
			const sc = new ServiceContainer();
			sc.setParameter(Config, { retries: 3, url: "https://x" });

			// No generic argument, no cast at the read site: the token carries the type.
			const config = sc.getParameter(Config);
			expect(config.retries).toBe(3);
			expect(config.url).toBe("https://x");
		});

		test("treats undefined/false/0 as set values (has, not undefined check)", () => {
			const Flag = parameter<boolean>("flag");
			const sc = new ServiceContainer();
			sc.setParameter(Flag, false);

			expect(sc.getParameter(Flag)).toBe(false);
		});

		test("injects a parameter into a constructor dependency list", () => {
			@Service(A, Repo)
			class NeedsRepo {
				constructor(
					public a: A,
					public repo: string,
				) {}
			}

			const sc = new ServiceContainer();
			sc.setParameter(Repo, "acme");
			const instance = sc.get(NeedsRepo);

			expect(instance.a).toBeInstanceOf(A);
			expect(instance.repo).toBe("acme");
		});

		test("a factory receives the container and can read a parameter", () => {
			class Conn {
				constructor(public dsn: string) {}
			}
			ServiceContainer.configure(Conn, (c) => new Conn(c.getParameter(Repo)));

			const sc = new ServiceContainer();
			sc.setParameter(Repo, "acme");

			expect(sc.get(Conn).dsn).toBe("acme");
		});

		test("a parameter set on global is inherited by a clone, which can override it", () => {
			const Env = parameter<string>("env");
			ServiceContainer.setParameter(Env, "production");

			const scoped = ServiceContainer.clone();
			expect(scoped.getParameter(Env)).toBe("production"); // inherited
			scoped.setParameter(Env, "staging");

			expect(scoped.getParameter(Env)).toBe("staging"); // overridden on the clone
			expect(ServiceContainer.getParameter(Env)).toBe("production"); // global untouched
		});

		// The core scoping guarantee. One registration, two clones. Each clone resolves
		// the graph against its own parameter. The unscoped parent has no parameter.
		test("clones scope parameters independently and never leak to the parent", () => {
			class Conn {
				constructor(public dsn: string) {}
			}
			ServiceContainer.configure(Conn, (c) => new Conn(c.getParameter(Repo)));

			const root = new ServiceContainer();
			const alpha = root.clone();
			alpha.setParameter(Repo, "alpha");
			const beta = root.clone();
			beta.setParameter(Repo, "beta");

			expect(alpha.get(Conn).dsn).toBe("alpha");
			expect(beta.get(Conn).dsn).toBe("beta");
			expect(() => root.get(Conn)).toThrow(/parameter "repo"/);
		});
	});

	describe("errors", () => {
		test("configuration errors identify the unconfigured service", () => {
			class UnconfiguredService {}

			let thrown: unknown;
			try {
				ServiceContainer.get(UnconfiguredService);
			} catch (error) {
				thrown = error;
			}

			expect(thrown).toBeInstanceOf(ServiceNotConfiguredError);
			if (!(thrown instanceof ServiceNotConfiguredError)) throw thrown;
			expect(thrown.message).toMatch(/@Service/);
			expect(thrown.service).toBe(UnconfiguredService);
		});

		test("resolution errors identify the requested service and conflicting instances", () => {
			abstract class Base {}
			class FirstImplementation extends Base {}
			class SecondImplementation extends Base {}

			const container = new ServiceContainer();
			const first = container.set(new FirstImplementation());
			const second = container.set(new SecondImplementation());

			let thrown: unknown;
			try {
				container.get(Base);
			} catch (error) {
				thrown = error;
			}

			expect(thrown).toBeInstanceOf(MultipleServiceInstancesError);
			if (!(thrown instanceof MultipleServiceInstancesError)) throw thrown;
			expect(thrown.service).toBe(Base);
			expect(thrown.instances).toEqual([first, second]);
		});
	});
});
