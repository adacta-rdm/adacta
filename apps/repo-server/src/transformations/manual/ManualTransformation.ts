import type { IResourceDocumentAttachment } from "~/apps/repo-server/interface/IResourceDocumentAttachment";
import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type { IResourceId } from "~/lib/database/Ids";
import type { ITransformationContext } from "~/lib/interface/ITransformationContext";
export const manualTransformation = createTransformationFunction(
	{
		transformationSource: { types: ["Raw", "TabularData"] },
		transformationTarget: { types: ["Raw"] },
	},
	{ output: { types: ["Raw"] } },
	(context, inputs) => {
		const transformationDoc = EntityFactory.create(
			"Transformation",
			{
				name: "manual",
				input: {
					// Since this transformation manually links two resources it needs the ID
					// of both resources. This is a special case as both the input and the output
					// do already exist before the transformation runs
					transformationSource: inputs.transformationSource,
					transformationTarget: inputs.transformationTarget,
				},
				output: {
					output: inputs.transformationTarget,
				},
			},
			context.getUser()
		);

		return {
			outputs: { output: inputs.transformationTarget },
			transformationDoc: transformationDoc,
		};
	}
);

function createTransformationFunction<
	TInputDefs extends ITransformationIODefinitions<object>,
	TOutputDefs extends ITransformationIODefinitions<object>
>(
	inputs: TInputDefs,
	outputs: TOutputDefs,
	fn: ITransformationFunctionFn<IInputOutput<TInputDefs>, IInputOutput<TOutputDefs>>
): ITransformationFunction<TInputDefs, TOutputDefs> {
	return Object.assign(fn, { inputs, outputs });
}

type ITransformationIODefinitions<T extends object> = {
	[K in keyof T]: {
		// One or more possible types
		types: IResourceDocumentAttachment["type"][];
		optional?: boolean;
	};
};

interface ITransformationFunction<TInputDefs, TOutputDefs>
	extends ITransformationFunctionFn<IInputOutput<TInputDefs>, IInputOutput<TOutputDefs>> {
	inputs: TInputDefs;
	outputs: TOutputDefs;
}

type ITransformationFunctionFn<
	TInputs extends IGenericInputOutput,
	TOutputs extends IGenericInputOutput
> = (
	context: ITransformationContext,
	inputs: TInputs
	// TODO: How to handle stuff like the additional "importWithWarnings" flag ?
	// TODO: Add optional progress flag
) => ITransformationFunctionReturnType<TOutputs>;

type IInputOutput<T> = Record<keyof T, IResourceId>;
type IGenericInputOutput = Record<string, IResourceId>;

interface ITransformationFunctionReturnType<TOutputs extends IGenericInputOutput> {
	// Outputs
	outputs: TOutputs;
	// Transformation Document describing the "this" invocation of that transformation function
	transformationDoc: DrizzleEntity<"Transformation">;
}
