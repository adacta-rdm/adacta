import type { TimeStyle } from "./TimeStyle";

export interface ITimeSettings {
	locale: string;
	dateStyle: NonNullable<TimeStyle>;
	timeStyle: NonNullable<TimeStyle>;
}
