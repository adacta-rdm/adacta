/**
 * Turns a name into a lowercase URL segment made from letters and numbers.
 */
export function slugify(name: string): string {
	return name
		.normalize("NFKD")
		.toLowerCase()
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^\p{Letter}\p{Number}]+/gu, "-")
		.replace(/^-|-$/g, "");
}

/**
 * Adds a numeric suffix when the base slug is already in use.
 */
export function availableSlug(name: string, usedSlugs: Iterable<string>): string {
	const base = slugify(name);
	const used = new Set(usedSlugs);
	if (!used.has(base)) return base;

	for (let suffix = 2; ; suffix += 1) {
		const candidate = `${base}-${suffix}`;
		if (!used.has(candidate)) return candidate;
	}
}
