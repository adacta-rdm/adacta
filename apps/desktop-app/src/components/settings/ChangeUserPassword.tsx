import {
	EuiButton,
	EuiCallOut,
	EuiFieldPassword,
	EuiForm,
	EuiFormRow,
	EuiSpacer,
	EuiTitle,
} from "@elastic/eui";
import { assertDefined } from "@omegadot/assert";
import React, { useState } from "react";

import { useService } from "~/apps/desktop-app/src/services/ServiceProvider";
import { GraphQLHeaderService } from "~/apps/desktop-app/src/services/repositoryId/GraphQLHeaderService";
import type { IChangePasswordRequest } from "~/lib/interface/IChangePasswordRequest";
import {
	NEW_PASSWORD_TOO_WEAK,
	OLD_PASSWORD_DID_NOT_MATCH,
} from "~/lib/interface/IChangePasswordResponseStatusCode";
import { RepoURL } from "~/lib/url/RepoURL";

export function ChangeUserPassword() {
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [newPassword2, setNewPassword2] = useState("");

	const [passwordError, setPasswordError] = useState<string[]>([]);
	const [password2Error, setPassword2Error] = useState<string[]>([]);

	const [submitLoading, setSubmitLoading] = useState(false);
	const [response, setResponse] = useState<ChangePasswordResponse | undefined>(undefined);

	const repoUrl = useService(RepoURL);
	const authToken = useService(GraphQLHeaderService).authToken;
	assertDefined(authToken);

	return (
		<>
			<EuiTitle>
				<h4>Change password</h4>
			</EuiTitle>
			<EuiSpacer size={"s"} />
			{response !== undefined && response !== "PASSWORD_CHANGED" && (
				<>
					<EuiCallOut color={"danger"} title={"Password change failed"}>
						{response === "OLD_PASSWORD_DID_NOT_MATCH" && (
							<>
								Your password could not be updated. Please check that your old password is correct
								and try again.
							</>
						)}
						{response === "NEW_PASSWORD_TOO_WEAK" && (
							<>
								Your password could not be updated. The password you entered needs to be at least 6
								characters long
							</>
						)}
					</EuiCallOut>
					<EuiSpacer />
				</>
			)}
			{response === "PASSWORD_CHANGED" ? (
				<EuiCallOut color={"success"} title={"Password changed"}>
					Your password has been successfully updated
				</EuiCallOut>
			) : (
				<EuiForm component="form">
					<EuiFormRow label={"Old password"}>
						<EuiFieldPassword
							value={oldPassword}
							onChange={(e) => setOldPassword(e.target.value)}
						/>
					</EuiFormRow>
					<EuiFormRow
						label={"New password"}
						error={passwordError}
						isInvalid={passwordError.length > 0}
					>
						<EuiFieldPassword
							value={newPassword}
							onChange={(e) => {
								setNewPassword(e.target.value);
								if (e.target.value.length >= 6) {
									setPasswordError([]);
								}
							}}
							onBlur={() => {
								if (newPassword.length < 6) {
									setPasswordError(["Password must be at least 6 characters long"]);
								}
							}}
						/>
					</EuiFormRow>
					<EuiFormRow
						label={"New password (again)"}
						error={password2Error}
						isInvalid={password2Error.length > 0}
					>
						<EuiFieldPassword
							value={newPassword2}
							onChange={(e) => {
								setNewPassword2(e.target.value);

								if (newPassword === e.target.value) {
									setPassword2Error([]);
								}
							}}
							onBlur={() => {
								if (newPassword !== newPassword2) {
									setPassword2Error(["Password must match"]);
								}
							}}
						/>
					</EuiFormRow>
					<EuiButton
						type="submit"
						onClick={() => {
							setSubmitLoading(true);
							doChangePassword(repoUrl, authToken, { oldPassword, newPassword })
								.then((r) => {
									setResponse(r);
								})
								.catch(() => setResponse("UNKNOWN"))
								.finally(() => {
									setSubmitLoading(false);
								});
						}}
						isLoading={submitLoading}
						disabled={submitLoading || newPassword !== newPassword2 || newPassword.length < 6}
					>
						Change password
					</EuiButton>
				</EuiForm>
			)}
		</>
	);
}

type ChangePasswordResponse =
	| "OLD_PASSWORD_DID_NOT_MATCH"
	| "NEW_PASSWORD_TOO_WEAK"
	| "PASSWORD_CHANGED"
	| "UNKNOWN";

async function doChangePassword(
	url: RepoURL,
	accessToken: string,
	args: IChangePasswordRequest
): Promise<ChangePasswordResponse> {
	const { oldPassword, newPassword } = args;
	const body = JSON.stringify({ oldPassword, newPassword });

	const result = await fetch(url.changePasswordEndpoint, {
		method: "POST",
		headers: {
			authorization: accessToken,
			"Content-Type": "application/json",
		},
		body,
	});

	if (result.ok) {
		return "PASSWORD_CHANGED";
	} else {
		switch (result.status) {
			case OLD_PASSWORD_DID_NOT_MATCH:
				return "OLD_PASSWORD_DID_NOT_MATCH";
			// NOTE: The UI does not currently allow the user to enter a password that is too weak
			// but the server will still validate it and return this error code if it is too weak
			// At the moment only passwords that are shorter than 6 characters are considered too
			// weak
			case NEW_PASSWORD_TOO_WEAK:
				return "NEW_PASSWORD_TOO_WEAK";
			default:
				return "UNKNOWN";
		}
	}
}
