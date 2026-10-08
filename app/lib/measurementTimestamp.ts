export function parseMeasurementTimestamp(
	value: string,
	format: string,
	timezone: string,
): Date | undefined {
	const tokens: Record<string, string> = {
		"%Y": "(?<year>\\d{4})",
		"%m": "(?<month>\\d{1,2})",
		"%d": "(?<day>\\d{1,2})",
		"%H": "(?<hour>\\d{1,2})",
		"%M": "(?<minute>\\d{1,2})",
		"%S": "(?<second>\\d{1,2})",
		"%L": "(?<millisecond>\\d{3})",
	};
	let pattern = "";
	for (let index = 0; index < format.length; index++) {
		if (format[index] === "%") {
			const token = format.slice(index, index + 2);
			if (!tokens[token]) return undefined;
			pattern += tokens[token];
			index++;
		} else pattern += format[index]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
	const groups = new RegExp(`^${pattern}$`).exec(value)?.groups;
	if (!groups) return undefined;
	const parts = [
		groups.year,
		groups.month ?? "1",
		groups.day ?? "1",
		groups.hour ?? "0",
		groups.minute ?? "0",
		groups.second ?? "0",
		groups.millisecond ?? "0",
	].map(Number);
	const [year, month, day, hour, minute, second, millisecond] = parts;
	const local = Date.UTC(year!, month! - 1, day!, hour!, minute!, second!, millisecond!);
	const check = new Date(local);
	if (
		check.getUTCFullYear() !== year ||
		check.getUTCMonth() + 1 !== month ||
		check.getUTCDate() !== day ||
		check.getUTCHours() !== hour ||
		check.getUTCMinutes() !== minute ||
		check.getUTCSeconds() !== second
	)
		return undefined;
	if (timezone === "UTC" || timezone === "Etc/UTC") return check;
	let formatter: Intl.DateTimeFormat;
	try {
		formatter = new Intl.DateTimeFormat("en-GB", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hourCycle: "h23",
		});
	} catch {
		return undefined;
	}
	const offsets = new Set<number>();
	for (const probe of [
		local - millisecond! - 86_400_000,
		local - millisecond!,
		local - millisecond! + 86_400_000,
	]) {
		const rendered = Object.fromEntries(
			formatter.formatToParts(new Date(probe)).map((part) => [part.type, part.value]),
		);
		offsets.add(
			(Date.UTC(
				Number(rendered.year),
				Number(rendered.month) - 1,
				Number(rendered.day),
				Number(rendered.hour),
				Number(rendered.minute),
				Number(rendered.second),
			) -
				probe) /
				60_000,
		);
	}
	const matches = [...offsets]
		.map((offset) => new Date(local - offset * 60_000))
		.filter((date) => {
			const rendered = Object.fromEntries(
				formatter.formatToParts(date).map((part) => [part.type, part.value]),
			);
			return (
				Number(rendered.year) === year &&
				Number(rendered.month) === month &&
				Number(rendered.day) === day &&
				Number(rendered.hour) === hour &&
				Number(rendered.minute) === minute &&
				Number(rendered.second) === second
			);
		});
	return matches.length === 1 ? matches[0] : undefined;
}
