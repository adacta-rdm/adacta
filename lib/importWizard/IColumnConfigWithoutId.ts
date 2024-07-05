import type { IColumnConfig } from "../interface/IImportWizardPreset";

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

type IColumnConfigWithoutId = DistributiveOmit<IColumnConfig, "columnId">;
export type IColumConfigWithoutIdAndName = DistributiveOmit<IColumnConfigWithoutId, "title">;
