import type { EuiCallOutProps } from "@elastic/eui/src/components/call_out/call_out";
import type { Toast } from "@elastic/eui/src/components/toast/global_toast_list";

export function euiSeverityToIcon(
	severity: Toast["color"] | EuiCallOutProps["color"]
): EuiCallOutProps["iconType"] {
	switch (severity) {
		case "success":
			return "check";
		case "warning":
		case "danger":
			return "alert";
		case "primary":
			return "iInCircle";
	}
}
