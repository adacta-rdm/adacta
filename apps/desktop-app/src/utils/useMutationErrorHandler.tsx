import { EuiCallOut, EuiSpacer } from "@elastic/eui";
import React, { useState } from "react";

import { useService } from "~/apps/desktop-app/src/services/ServiceProvider";
import { ToasterService } from "~/apps/desktop-app/src/services/toaster/ToasterService";

interface IMutationResponse<TMutationData> {
	readonly error: { readonly message: string } | null;
	readonly data: TMutationData | null;
}

interface IOptions {
	onError?: (error: string) => void;

	/**
	 * Automatically show a toast when an error occurs
	 */
	autoToast?: boolean;

	/**
	 * Automatically render a callout when an error occurs.
	 * This is useful for forms where the error should be displayed near the form.
	 * NOTE: The caller is responsible for rendering the returned <ErrorCallout/> component
	 */
	autoCallout?: boolean;
}

/**
 * A hook to handle errors from mutations which implement the ErrorMessageOr_T pattern
 * If the mutation is successful, the data is returned as `T`
 * If the mutation is unsuccessful, `null` is returned and the error is handled depending on the
 * options.
 * @param {IOptions} opts - Options to control the behavior of the error handling
 */
export function useMutationErrorHandler(opts?: IOptions) {
	const toaster = useService(ToasterService);
	const [error, setError] = useState<string | undefined>(undefined);

	const mutationUnwrapper = function handle<T>(data: IMutationResponse<T>) {
		if (data.error !== null) {
			if (opts?.autoToast) {
				toaster.addToast("Error", data.error.message, "danger");
			}

			if (opts?.autoCallout) {
				setError(data.error.message);
			}

			if (opts?.onError) {
				opts.onError(data.error.message);
			}
		} else if (data.data === null) {
			throw new Error("No data returned");
		}

		return data.data;
	};

	const ErrorCallout = () =>
		error ? (
			<>
				<EuiCallOut title="Error" color="danger">
					{error}
				</EuiCallOut>
				<EuiSpacer />
			</>
		) : null;

	return [mutationUnwrapper, ErrorCallout] as const;
}
