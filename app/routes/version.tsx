export function meta() {
	return [{ title: "Version — Adacta" }];
}

export default function Version() {
	return (
		<main className="mx-auto max-w-xl p-6 text-foreground lg:p-10">
			<h1 className="text-2xl/8 font-semibold sm:text-xl/8">Version</h1>

			<dl className="mt-6 space-y-6 text-sm/6">
				<div>
					<dt className="font-medium text-foreground-muted">Commit</dt>
					<dd className="mt-2 break-all">{import.meta.env.ADACTA_COMMIT}</dd>
				</div>
				<div>
					<dt className="font-medium text-foreground-muted">Build time (UTC)</dt>
					<dd className="mt-2 break-all">{import.meta.env.ADACTA_BUILD_TIME}</dd>
				</div>
			</dl>
		</main>
	);
}
