import {
	EuiButton,
	EuiCallOut,
	EuiFieldPassword,
	EuiFieldText,
	EuiFlexGroup,
	EuiFlexItem,
	EuiForm,
	EuiFormRow,
	EuiLink,
	EuiLoadingSpinner,
	EuiSpacer,
} from "@elastic/eui";
import React, { useState } from "react";

import { useRouter } from "../../../hooks/useRouter";
import { useService } from "../../../services/ServiceProvider";
import { GraphQLHeaderService } from "../../../services/repositoryId/GraphQLHeaderService";

import type { IRegisterRequest } from "~/lib/interface/IRegisterRequest";
import type { IRegisterResponse } from "~/lib/interface/IRegisterResponse";
import { assertIRegisterResponse } from "~/lib/interface/type_checks/assertIRegisterResponse";
import { RepoURL } from "~/lib/url/RepoURL";

export function Register() {
	const { router } = useRouter();
	const repoUrl = useService(RepoURL);
	const graphQLHeaders = useService(GraphQLHeaderService);

	const [isRegisterInFlight, setRegisterInFlight] = useState(false);

	const [email, setEmail] = useState("");
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [password, setPassword] = useState("");

	const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

	const [error, setError] = useState<string | undefined>();

	if (isRegisterInFlight) {
		return <EuiLoadingSpinner />;
	}

	const submitRegistration = async () => {
		setRegisterInFlight(true);
		try {
			const response = await doRegister(repoUrl, { email, firstName, lastName, password });

			if (!response?.success) {
				setError(response?.message ?? "Registration failed (unknown error)");
				return;
			}

			if (!response?.accessToken) {
				return setError("Registration failed (unknown error)");
			}

			graphQLHeaders.authToken = response.accessToken;

			// Navigate to the repositories page after login
			// Use replace instead of push to avoid the user being able to go back to the login page
			router.replace("/repositories");
		} finally {
			setRegisterInFlight(false);
		}
	};

	return (
		<>
			{error && (
				<>
					<EuiCallOut color={"danger"}>{error}</EuiCallOut>
					<EuiSpacer />
				</>
			)}
			<EuiForm component="form">
				<EuiFormRow label="E-Mail">
					<EuiFieldText name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
				</EuiFormRow>
				<EuiFormRow label="First Name">
					<EuiFieldText
						name="firstName"
						value={firstName}
						onChange={(e) => setFirstName(e.target.value)}
					/>
				</EuiFormRow>
				<EuiFormRow label="Last Name">
					<EuiFieldText
						name="lastName"
						value={lastName}
						onChange={(e) => setLastName(e.target.value)}
					/>
				</EuiFormRow>
				<EuiFormRow label="Password" error={passwordErrors} isInvalid={passwordErrors.length > 0}>
					<EuiFieldPassword
						name="password"
						value={password}
						onChange={(e) => {
							setPassword(e.target.value);
							if (e.target.value.length < 6) {
								setPasswordErrors(["Password must be at least 6 characters long"]);
							} else {
								setPasswordErrors([]);
							}
						}}
						isInvalid={password.length > 0 && password.length < 6}
					/>
				</EuiFormRow>

				<EuiFormRow>
					<EuiFlexGroup alignItems={"center"}>
						<EuiFlexItem grow={false}>
							{}
							<EuiButton
								onClick={() => void submitRegistration()}
								disabled={!(firstName && lastName && password)}
							>
								Create Account
							</EuiButton>
						</EuiFlexItem>

						<EuiFlexItem grow={false}>
							<EuiLink onClick={() => router.push("/login")}>I already have an account</EuiLink>
						</EuiFlexItem>
					</EuiFlexGroup>
				</EuiFormRow>
			</EuiForm>
		</>
	);
}

async function doRegister(
	url: RepoURL,
	args: IRegisterRequest
): Promise<IRegisterResponse | undefined> {
	const { firstName, lastName, email, password } = args;
	const body = JSON.stringify({ firstName, lastName, email, password });

	const result = await fetch(url.registerEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body,
	});

	const registerResponse: unknown = await result.json();

	assertIRegisterResponse(registerResponse);
	return registerResponse;
}
