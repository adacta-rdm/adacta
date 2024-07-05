import type { Opaque } from "type-fest";

/**
 * Callback to report the progress of a task. The progress arg is expected to be a number between
 * 0 and 100.
 */
export interface IProgressReporterFn {
	(progress: number, status?: string): void;

	value: IProgressValue;
	fork(limitPoint1: number): [IProgressReporterFn, IProgressReporterFn];
	fork(
		limitPoint1: number,
		limitPoint2: number
	): [IProgressReporterFn, IProgressReporterFn, IProgressReporterFn];
	fork(
		limitPoint1: number,
		limitPoint2: number,
		limitPoint3: number
	): [IProgressReporterFn, IProgressReporterFn, IProgressReporterFn, IProgressReporterFn];

	fork(...limitPoints: number[]): IProgressReporterFn[];

	forkEqual(numberOfChildReporters: number): IProgressReporterFn[];
}

export type IProgressFn = (progress: number, status?: string) => void | IProgressReporterFn;

export type IProgressValue = Opaque<number, IProgressReporterFn>;
export interface IProgress {
	value: IProgressValue;
	status?: string;
}
