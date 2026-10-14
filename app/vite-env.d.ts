interface ImportMetaEnv {
	readonly NODE_ENV: string;
	readonly ADACTA_COMMIT: string;
	readonly ADACTA_BUILD_TIME: string;
}

interface ImportMeta {
	// Bun permits arbitrary environment names. Vite replaces only declared names.
	readonly env: {
		[Key in keyof ImportMetaEnv as string extends Key ? never : Key]: ImportMetaEnv[Key];
	};
}
