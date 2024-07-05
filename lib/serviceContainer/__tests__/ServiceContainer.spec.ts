import type { Mock } from "vitest";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";

import { Service, ServiceContainer } from "../ServiceContainer";

describe("ServiceContainer", () => {
	let spyA: Mock;
	beforeEach(() => {
		spyA = vi.fn();
	});

	afterEach(() => ServiceContainer.reset());

	@Service()
	class A {
		constructor() {
			// Workaround to track constructor invocation (jest docs unclear on how to do this with jest.spyOn)
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

		// instance of A was instantiated before cloning, so it must be the same instance
		expect(rootA).toBe(clonedA);

		// instance of B was instantiated after cloning, so it must be a different instance
		const rootB = root.get(B);
		const clonedB = cloned.get(B);

		expect(rootB).not.toBe(clonedB);
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

		const factory = vi.fn(() => new A("test"));

		ServiceContainer.configure(A, factory);

		const instance = ServiceContainer.get(A);

		expect(instance).toBeInstanceOf(A);
		expect(instance.str).toBe("test");
		expect(factory).toHaveBeenCalledTimes(1);
	});

	describe("errors", () => {
		test("throws error when attempting to get non-decorated service", () => {
			expect(() => ServiceContainer.get(class AnyClass {})).toThrow(/@Service/);
		});
	});
});
