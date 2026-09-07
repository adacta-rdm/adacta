import { createAuthClient } from "better-auth/react";
import { useState } from "react";
import { useNavigate } from "react-router";

import { AuthLayout } from "~/catalyst-ui/auth-layout.tsx";
import { Button } from "~/catalyst-ui/button.tsx";
import { Field, Fieldset, Label } from "~/catalyst-ui/fieldset.tsx";
import { Heading } from "~/catalyst-ui/heading.tsx";
import { Input } from "~/catalyst-ui/input.tsx";
import { Text } from "~/catalyst-ui/text.tsx";

/**
 * Better Auth keeps the session in a cookie that it sets from the browser. The
 * form therefore posts through the client rather than through a route action.
 */
const authClient = createAuthClient();

export function meta() {
	return [{ title: "Sign in — Adacta" }];
}

export default function Login() {
	const navigate = useNavigate();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [signingIn, setSigningIn] = useState(false);

	async function signIn(event: React.SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();

		setSigningIn(true);

		await authClient.signIn.email(
			{ email, password },
			{
				onSuccess: () => void navigate("/"),

				// The page stays put on a failure, so the button is released again.
				// A success navigates away and leaves it disabled.
				onError: (context) => {
					setError(context.error.message);
					setSigningIn(false);
				},
			},
		);
	}

	return (
		<AuthLayout>
			<form onSubmit={signIn} className="w-full max-w-sm">
				{/*
				 * This page names the product. It is the only page a visitor sees
				 * before signing in, and the application shell carries no name.
				 */}
				<Heading>Adacta</Heading>
				<Text className="mt-1">Sign in to open a repository.</Text>

				<Fieldset className="mt-8">
					<Field>
						<Label>Email</Label>
						<Input
							type="email"
							name="email"
							value={email}
							autoComplete="username"
							onChange={(event) => setEmail(event.target.value)}
						/>
					</Field>

					<Field className="mt-4">
						<Label>Password</Label>
						<Input
							type="password"
							name="password"
							value={password}
							autoComplete="current-password"
							onChange={(event) => setPassword(event.target.value)}
						/>
					</Field>
				</Fieldset>

				{error ? (
					<p role="alert" className="mt-4 text-sm text-danger">
						{error}
					</p>
				) : null}

				<Button type="submit" disabled={signingIn} className="mt-6 w-full">
					{signingIn ? "Signing in…" : "Sign in"}
				</Button>
			</form>
		</AuthLayout>
	);
}
