import { EuiCallOut } from "@elastic/eui";
import type { RouterState } from "found";
import { withRouter } from "found";
import type { ErrorInfo, ReactNode } from "react";
import React, { Component } from "react";

interface IProps extends RouterState {
	children: ReactNode;
	renderError?: JSX.Element | string;
}

interface IState {
	error?: Error;
	hasError: boolean;
}

export const ErrorBoundary = withRouter(
	class ErrorBoundary extends Component<IProps, IState> {
		public state: IState = {
			hasError: false,
		};

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		public static getDerivedStateFromError(error: Error): IState {
			// Update state so the next render will show the fallback UI.
			return { hasError: true };
		}

		public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
			this.setState({ hasError: true, error });
			// eslint-disable-next-line no-console
			console.error("Error:", error, "ErrorInfo:", errorInfo);
		}

		public render() {
			if (this.state.hasError) {
				if (this.props.renderError !== undefined) {
					return this.props.renderError;
				}
				return (
					<EuiCallOut color={"danger"} title="An unexpected error occurred :(">
						Information about the error:
						<br />
						{this.state.error?.message}
						<br />
						<br />
						{this.props.match?.location.pathname}
					</EuiCallOut>
				);
			}

			return this.props.children;
		}
	}
);
