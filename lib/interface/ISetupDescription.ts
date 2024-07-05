import type { IDatetime } from "~/lib/createDate";
import type { IResourceId } from "~/lib/database/Ids";
import type { ISetupLabel } from "~/lib/interface/ISetupLabel";

export interface ISetupDescription {
	imageResource: IResourceId;
	setupLabels: ISetupLabel[];

	begin: IDatetime;
	end?: IDatetime;
}
