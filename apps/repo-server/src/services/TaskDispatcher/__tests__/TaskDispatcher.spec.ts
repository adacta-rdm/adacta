import { describe, test, expect } from "vitest";
import { vi as jest } from "vitest";

import { RemoteServicesConfig } from "../../../config/RemoteServicesConfig";
import { TaskDispatcher } from "../TaskDispatcher";

import { SilentLogger } from "~/lib/logger/SilentLogger";

describe("TaskDispatcher", () => {
	test("makes HTTP request to remote service", () => {
		const td = new TaskDispatcher(
			new RemoteServicesConfig({ baseURL: new URL("https://localhost/") }),
			new SilentLogger()
		);

		const spy = jest
			.spyOn(global, "fetch")
			.mockImplementation(() => Promise.resolve({} as Response));

		void td.dispatch("resources/downsample", {
			input: {
				prefix: "",
				path: "foo",
				numberRows: 500,
				numberColumns: 5,
				columns: { x: 0, y: [1] },
			},
			threshold: 1,
		});

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy.mock.calls[0][0]).toBe("https://localhost/resources/downsample");
	});
});
