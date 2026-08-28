import { useState } from "react";
import { useNavigate } from "react-router";

import { authClient } from "~/app/lib/auth.client";
import { Button } from "~/catalyst-ui/button";
import { Field, Fieldset, Label } from "~/catalyst-ui/fieldset";
import { Heading } from "~/catalyst-ui/heading";
import { Input } from "~/catalyst-ui/input";
import { Text } from "~/catalyst-ui/text";

export function meta() {
	return [{ title: "Sign in — Adacta" }];
}

export default function Login() {
	const navigate = useNavigate();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	async function signIn(event: React.FormEvent) {
		event.preventDefault();
		setError("");

		await authClient.signIn.email(
			{ email, password },
			{
				onSuccess: () => void navigate("/"),
				onError: (context) => setError(context.error.message),
			},
		);
	}

	return (
		<div className="mx-auto grid min-h-svh max-w-sm place-items-center p-8">
			<form onSubmit={signIn} className="w-full">
				<Heading>Sign in</Heading>
				<Text className="mt-1">Sign in to open a repository.</Text>

				<Fieldset className="mt-6">
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

				{error ? <Text className="mt-4 text-red-600 dark:text-red-400">{error}</Text> : null}

				<Button type="submit" className="mt-6 w-full">
					Sign in
				</Button>
			</form>
		</div>
	);
}
