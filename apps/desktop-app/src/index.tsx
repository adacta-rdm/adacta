import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiProvider, EuiSpacer } from "@elastic/eui";
import { createBrowserRouter, resolver } from "found";
import React, { Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RelayEnvironmentProvider } from "react-relay/hooks";
import { Environment } from "relay-runtime";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { Service } from "./services/ServiceProvider";
import { serviceConfiguration } from "./services/config";
import { GraphQLHeaderService } from "./services/repositoryId/GraphQLHeaderService";
import { RouterService } from "./services/router/RouterService";

import svg from "~/apps/desktop-app/public/images/AdactaLogo.svg";
import "@/euiIcons";

// Bundle additional Moment.js locales
import "../src/lib/momentLocales";

(async function main() {
	const container = document.createElement("div");
	container.setAttribute("style", "height: 100%");
	document.body.appendChild(container);

	const root = createRoot(container);
	root.render(<LoadingSplashscreen />);

	const serviceContainer = await serviceConfiguration.getInstance();

	const Router = createBrowserRouter({
		routeConfig: RouterService.getRouterConfig(
			serviceContainer.get(Environment),
			serviceContainer.get(GraphQLHeaderService)
		),
		renderError: function RouteErrorRenderer(props) {
			return (
				<>
					<DebugProps {...props} />
				</>
			);
		},
	});

	root.render(
		<Service.Provider value={serviceContainer}>
			<RelayEnvironmentProvider environment={serviceContainer.get(Environment)}>
				<EuiProvider>
					<ErrorBoundary>
						<Suspense fallback={<LoadingSplashscreen />}>
							<Router resolver={resolver} />
						</Suspense>
					</ErrorBoundary>
				</EuiProvider>
			</RelayEnvironmentProvider>
		</Service.Provider>
	);
})().catch((e) => {
	throw e;
});

function DebugProps(props: any) {
	return (
		<div>
			Error!
			<pre>{JSON.stringify(props, null, 2)}</pre>
		</div>
	);
}

function LoadingSplashscreen() {
	const [text, setText] = useState("Loading   ");

	useEffect(() => {
		const updateLoadingText = () => {
			setText(text.includes("...") ? "Loading   " : text.replace(/ /, "."));
		};
		const intervalId = setInterval(updateLoadingText, 500);

		return function cleanup() {
			clearInterval(intervalId);
		};
	}, [text, setText]);

	return (
		<EuiFlexGroup
			direction="column"
			justifyContent="center"
			alignItems="center"
			style={{ height: "100vh" }}
		>
			<EuiFlexItem grow={false}>
				<EuiImage src={svg} size={"s"} alt={"Adacta Logo"} />
			</EuiFlexItem>
			<EuiFlexItem grow={false}>
				<EuiSpacer />
				<small style={{ whiteSpace: "pre" }}>{text}</small>
			</EuiFlexItem>
		</EuiFlexGroup>
	);
}
