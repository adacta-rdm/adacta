import { cloneDeep, isEqual } from "lodash-es";
import type { ErrorInfo } from "react";
import React, { useEffect, useState } from "react";
import Timeline from "react-vis-timeline";
import type { TimelineGroup, TimelineItem } from "vis-timeline/types";
import "@/timeline.dist.css";

interface IProps {
	timelineRef: React.RefObject<Timeline>;
	options?: Timeline["props"]["options"];

	groups?: TimelineGroup[];
	items?: TimelineItem[];
}

function VisTimelineCore(props: IProps) {
	const { timelineRef } = props;

	const [items, setItems] = useState(props.items);
	const [groups, setGroups] = useState(props.groups);

	const patchItems = (items: TimelineItem[]) =>
		items.map((i) => ({ ...i, end: i.end ?? new Date() }));

	// useEffect(() => {
	// 	const timerId = setInterval(() => {
	// 		setItems((items) => patchItems(items ?? []));
	// 		if (timelineRef.current) {
	// 			// Remove old marker if it exists
	// 			// NOTE: Right now there is no check if the existing custom time is the
	// 			// "currentTime"-marker (it could be a different custom time)
	// 			// As of now the customTime feature is only used for the "currenTime" this solution
	// 			// should be fine.
	// 			// A real check on whether the existing customTime is the right one would be even
	// 			// less typesafe or would require its own types
	// 			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-member-access
	// 			const existingCustomTimes = (timelineRef.current.timeline as any).customTimes as Array<any>;
	// 			if (existingCustomTimes.length > 0) {
	// 				timelineRef.current.timeline.removeCustomTime("currentTime");
	// 			}
	// 			timelineRef.current.timeline.addCustomTime(new Date(), "currentTime");
	// 		}
	// 	}, 5000);
	// 	return function cleanup() {
	// 		clearInterval(timerId);
	// 	};
	// }, [timelineRef]);

	// Only update local state if value (and not reference) of props change
	useEffect(() => {
		if (!isEqual(items, props.items)) {
			setItems(props.items);
		}

		if (!isEqual(groups, props.groups)) {
			setGroups(props.groups);
		}
	}, [props.groups, props.items, groups, items]);

	// Update timeline according to local state
	useEffect(() => {
		if (!timelineRef?.current) return;

		// Updating the data is only possible via `ref`
		timelineRef.current.timeline.setData({
			items: patchItems(items ?? []),
			groups: cloneDeep(groups) ?? [],
		});
	}, [timelineRef, groups, items]);

	return <Timeline ref={timelineRef} options={props.options} />;
}

interface IState {
	hasError: boolean;
	error?: Error;
}

/*
 * Wrapper around VisTimelineCore which acts as error boundary (catches errors and renders)
 * instead of crashing the app. This is needed since the base component that is used for the
 * timeline is not completely compatible with React 18.
 */
export class VisTimeline extends React.Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);
		this.state = { hasError: false };
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public static getDerivedStateFromError(error: Error): IState {
		// Update state so the next render will show the fallback UI.
		return { hasError: true };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		this.setState({ hasError: true, error });
		// eslint-disable-next-line no-console
		console.error("Timeline-Error:", error, "ErrorInfo:", errorInfo);
	}

	render() {
		if (this.state.hasError) {
			// Error? There is no error! Just continue inconspicuously
			return <VisTimelineCore {...this.props} />;
		}

		return <VisTimelineCore {...this.props} />;
	}
}

export type { TimelineGroup };
