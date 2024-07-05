import assert from "assert";

import { range } from "lodash";

import type { IProgress, IProgressReporterFn, IProgressValue } from "./IProgressReporterFn";

export function createProgressReporter(
	reporter: (progress: IProgress) => void
): IProgressReporterFn {
	const children: { min: number; max: number; report: IProgressReporterFn }[] = [];

	function report(percentage: number, status?: string) {
		// Ensure that the progress is never decreased and that it never exceeds 100
		if (percentage > 100) percentage = 100;
		if (percentage <= report.value) return;

		report.value = percentage as IProgressValue;

		reporter({ value: report.value as IProgressValue, status });
	}

	report.value = 0 as IProgressValue;

	report.fork = (...limitPoints: number[]): IProgressReporterFn[] => {
		if (children.length > 0) {
			throw new Error("Cannot fork a reporter more than once. Fork the child reporters instead.");
		}
		assert.ok(limitPoints.length > 0, "Must pass at least one split point.");

		const points = [0, ...limitPoints, 100];
		for (let i = 1; i < points.length; ++i) {
			const min = points[i - 1];
			const max = points[i];
			assert.ok(min < max, "Must pass arguments between 0 and 100 in ascending order.");

			children.push({
				min,
				max,
				report: createProgressReporter(
					// When a child reporter is called, it updates its value property (see the report
					// function) and then calls the following function. This function wraps the report
					// function of the child's parent and does two things. First, it scales the value of the
					// child reporter from the range [0, 100] to the sub-range (defined as [min, max]) of the
					// parent reporter. Second, it computes the sum of all sibling reporters on every progress
					// update, so that the child reporters can be called in any order.
					({ status }) => {
						const computedValue = children.reduce(
							(sum, child) => sum + ((child.max - child.min) * child.report.value) / 100,
							0
						);

						report(computedValue, status);
					}
				),
			});
		}

		return children.map((child) => child.report);
	};

	report.forkEqual = (points: number) => {
		// While it doesn't really make sense to split a reporter into 1 child it is handy to be
		// able to call this function with dynamic values which might be 1.
		if (points === 1) {
			return [report];
		}

		return report.fork(...range(100 / points, 100, 100 / points));
	};

	return report as IProgressReporterFn;
}
