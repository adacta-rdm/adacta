import { useState } from "react";

export function useChartActions(allDeviceIds: string[]) {
	const [hideDevices, setHideDevices] = useState<string[]>([]);
	const solo = (id: string) => setHideDevices(allDeviceIds.filter((s) => s !== id));
	const show = (id: string) => setHideDevices(hideDevices.filter((s) => s !== id));
	const hide = (id: string) => setHideDevices([...hideDevices, id]);
	const showAll = () => setHideDevices([]);

	return { hideDevices, solo, show, hide, showAll };
}
