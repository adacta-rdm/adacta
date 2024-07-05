import { EuiGlobalToastList } from "@elastic/eui";
import type { Toast } from "@elastic/eui/src/components/toast/global_toast_list";
import type { ReactChild } from "react";
import React, { useState } from "react";

import { euiSeverityToIcon } from "../../utils/euiSeverityToIcon";
import { useService } from "../ServiceProvider";

import { uuid } from "~/lib/uuid";

export class ToasterService {
	addToast!: (title: string, text?: string | ReactChild, severity?: Toast["color"]) => void;
}

function useToasterSetupHook() {
	const toaster = useService(ToasterService);
	const [toasts, setToasts] = useState<Toast[]>([]);

	const addToast = (title: string, text?: string | ReactChild, severity?: Toast["color"]) => {
		setToasts(
			toasts.concat({
				id: uuid(),
				title: <span>{title}</span>,
				text: typeof text === "string" ? <span>{text}</span> : text,
				color: severity,
				iconType: euiSeverityToIcon(severity),
			})
		);
	};

	const removeToast = (removedToast: Toast) => {
		setToasts(toasts.filter((toast) => toast.id !== removedToast.id));
	};

	toaster.addToast = addToast;

	return { toasts, removeToast };
}

// Used only once in the `View` component.
export function GlobalToastList() {
	const { toasts, removeToast } = useToasterSetupHook();
	return <EuiGlobalToastList toasts={toasts} dismissToast={removeToast} toastLifeTimeMs={6000} />;
}
