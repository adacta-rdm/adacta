import { EuiCallOut, EuiFieldText, EuiSpacer } from "@elastic/eui";
import type { ComponentProps, ForwardedRef } from "react";
import React, { useImperativeHandle, useState } from "react";
import { fetchQuery, graphql, useRelayEnvironment } from "react-relay";

import { useRepositoryId } from "../services/router/UseRepoId";

import type { NameAvailabilityCheckTarget, UniqueNameQuery } from "@/relay/UniqueNameQuery.graphql";

interface IValidationHandler {
	validate: () => Promise<void>;
}

const query = graphql`
	query UniqueNameQuery(
		$repositoryId: ID!
		$name: String!
		$checkFor: NameAvailabilityCheckTarget!
	) {
		repository(id: $repositoryId) {
			checkNameAvailability(name: $name, checkFor: $checkFor) {
				isAvailable
				conflictResolution
			}
		}
	}
`;

interface IProps {
	value: string;

	uniqueName: {
		checkFor: NameAvailabilityCheckTarget;

		/**
		 * This function is called when the validation is done. The errors are passed as an array of
		 * strings. If the array is empty, the name is available.
		 */
		setErrors: (errors: string[]) => void;

		/**
		 * When editing an existing entity, the current name is passed here. This is used to allow the
		 * thins to keep their name when editing
		 */
		ignoreValidationForValue?: string;

		formState: {
			isLoading: boolean;
			setIsLoading: (isRefreshing: boolean) => void;
		};
	};
}

type Props = ComponentProps<typeof EuiFieldText> & IProps;

export const UniqueName = React.forwardRef(UniqueNameRender);

function UniqueNameRender(props: Props, ref: ForwardedRef<IValidationHandler>) {
	const environment = useRelayEnvironment();
	const repositoryId = useRepositoryId();

	const { uniqueName: uniqueNameProps } = props;
	const { isLoading, setIsLoading } = uniqueNameProps.formState;
	const [warning, setWarning] = useState<string | undefined>(undefined);

	async function validate() {
		setIsLoading(true);
		const data = await fetchQuery<UniqueNameQuery>(environment, query, {
			repositoryId,
			name: props.value,
			checkFor: uniqueNameProps.checkFor,
		}).toPromise();
		setIsLoading(false);

		const validationResponse = data?.repository.checkNameAvailability;

		const isAvailable = validationResponse?.isAvailable ?? false;

		const showMessage = !isAvailable && uniqueNameProps.ignoreValidationForValue != props.value;

		if (validationResponse?.conflictResolution === "DENY") {
			uniqueNameProps.setErrors(
				showMessage
					? [`The name ${props.value} is already taken. Please enter a different one.`]
					: []
			);
		} else if (validationResponse?.conflictResolution === "WARN") {
			setWarning(
				showMessage
					? `The name ${props.value} is already taken. This is possible, but can lead to situations in which it is difficult to identify the device by its name.`
					: undefined
			);
		}
	}

	useImperativeHandle(ref, () => ({
		validate,
	}));

	return (
		<>
			<EuiFieldText
				{...props}
				isInvalid={false}
				onChange={(e) => {
					if (props.onChange) {
						props.onChange(e);
					}
				}}
				onBlur={() => void validate()}
				isLoading={isLoading}
			/>
			<EuiSpacer size={"xs"} />
			{warning !== undefined && (
				<EuiCallOut color={"warning"} title={<>Duplicate name</>}>
					{warning}
				</EuiCallOut>
			)}
		</>
	);
}
