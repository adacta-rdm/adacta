import b from "benny";

export const castToNumberSuite = () =>
	b.suite(
		"Example",

		b.add("Cast using number", () => {
			Number(String("42"));
		}),

		b.add("Cast using +", () => {
			+String("42");
		}),

		b.cycle(),
		b.complete()
	);
