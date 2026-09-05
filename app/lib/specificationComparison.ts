/**
 * Which specifications tell the products of one series apart.
 *
 * A manufacturer sells nine EL-FLOW Select controllers that share a
 * photograph, an accuracy, and an operating temperature. They differ in three
 * lines: the configured flow, the calibration gas, and the nominal air range.
 * A reader choosing between them needs those three.
 *
 * A line counts as shared when every product states it with the same value. A
 * line that one product leaves out varies, because claiming a value the
 * product never stated would be wrong.
 */

export type Specification = { name: string; value: string };

export type SpecificationComparison = {
	/**
	 * Lines every product states with the same value, in the order they first
	 * appear.
	 */
	shared: Specification[];

	/**
	 * The names of the lines that differ, in the order they first appear.
	 */
	varying: string[];
};

export function compareSpecifications(
	products: { specifications: Specification[] }[],
): SpecificationComparison {
	const valuesByName = new Map<string, Set<string>>();
	const countByName = new Map<string, number>();
	const order: string[] = [];

	for (const product of products) {
		for (const specification of product.specifications) {
			if (!valuesByName.has(specification.name)) {
				valuesByName.set(specification.name, new Set());
				countByName.set(specification.name, 0);
				order.push(specification.name);
			}

			valuesByName.get(specification.name)?.add(specification.value);
			countByName.set(specification.name, (countByName.get(specification.name) ?? 0) + 1);
		}
	}

	const shared: Specification[] = [];
	const varying: string[] = [];

	for (const name of order) {
		const values = valuesByName.get(name) ?? new Set<string>();
		const statedByEvery = countByName.get(name) === products.length;

		if (statedByEvery && values.size === 1) {
			shared.push({ name, value: [...values][0] });
		} else {
			varying.push(name);
		}
	}

	return { shared, varying };
}
