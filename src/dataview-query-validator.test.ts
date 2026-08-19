import { describe, expect, it, vi } from "vitest";
import { attachDataviewQueryValidation, DataviewQueryValidationState, renderDataviewQueryStatus } from "./dataview-query-validator";
import { DataviewApi, DataviewQueryResult } from "./sources/dataview-api";

function makeApp(api: DataviewApi | null): unknown {
	return {
		plugins: {
			plugins: api ? { dataview: { api } } : {},
		},
	};
}

function makeApi(query: (source: string) => Promise<DataviewQueryResult>): DataviewApi {
	return { query, pages: () => [] };
}

function collectStates(): { onStateChange: (state: DataviewQueryValidationState, message?: string) => void; calls: [DataviewQueryValidationState, string | undefined][] } {
	const calls: [DataviewQueryValidationState, string | undefined][] = [];
	return { onStateChange: (state, message) => calls.push([state, message]), calls };
}

describe("attachDataviewQueryValidation", () => {
	it("reports empty for a blank query without calling dataview", async () => {
		const query = vi.fn();
		const app = makeApp(makeApi(query));
		const { onStateChange, calls } = collectStates();

		const validation = attachDataviewQueryValidation(app as never, () => "   ", onStateChange);
		validation.validateNow();
		await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));

		expect(calls).toEqual([["empty", undefined]]);
		expect(query).not.toHaveBeenCalled();
	});

	it("reports unavailable when dataview isn't installed", async () => {
		const app = makeApp(null);
		const { onStateChange, calls } = collectStates();

		const validation = attachDataviewQueryValidation(app as never, () => 'from "Journal"', onStateChange);
		validation.validateNow();
		await vi.waitFor(() => expect(calls.at(-1)?.[0]).toBe("unavailable"));
	});

	it("reports pending then valid for a successful query", async () => {
		const query = vi.fn(async (): Promise<DataviewQueryResult> => ({ successful: true, value: { type: "table", values: [] } }));
		const app = makeApp(makeApi(query));
		const { onStateChange, calls } = collectStates();

		const validation = attachDataviewQueryValidation(app as never, () => 'from "Journal"', onStateChange);
		validation.validateNow();
		await vi.waitFor(() => expect(calls.at(-1)?.[0]).toBe("valid"));

		expect(calls[0]).toEqual(["pending", undefined]);
		expect(query).toHaveBeenCalledWith('from "Journal"');
	});

	it("reports invalid with a message for a failing query", async () => {
		const query = vi.fn(async (): Promise<DataviewQueryResult> => ({ successful: false, error: "boom" }));
		const app = makeApp(makeApi(query));
		const { onStateChange, calls } = collectStates();

		const validation = attachDataviewQueryValidation(app as never, () => "garbage", onStateChange);
		validation.validateNow();
		await vi.waitFor(() => expect(calls.at(-1)?.[0]).toBe("invalid"));

		expect(calls.at(-1)?.[1]).toContain("boom");
	});

	it("ignores a stale in-flight result once a newer request has resolved", async () => {
		let resolveFirst!: (r: DataviewQueryResult) => void;
		const query = vi
			.fn()
			.mockImplementationOnce(() => new Promise<DataviewQueryResult>((resolve) => (resolveFirst = resolve)))
			.mockImplementationOnce(async () => ({ successful: true, value: { type: "table", values: [] } }) as DataviewQueryResult);
		const app = makeApp(makeApi(query));
		const { onStateChange, calls } = collectStates();
		let value = "first query";

		const validation = attachDataviewQueryValidation(app as never, () => value, onStateChange);
		validation.validateNow();
		await vi.waitFor(() => expect(query).toHaveBeenCalledTimes(1));

		value = "second query";
		validation.validateNow();
		await vi.waitFor(() => expect(calls.at(-1)?.[0]).toBe("valid"));

		resolveFirst({ successful: false, error: "stale failure" });
		await new Promise((r) => window.setTimeout(r, 10));

		expect(calls.at(-1)?.[0]).toBe("valid");
	});
});

describe("renderDataviewQueryStatus", () => {
	function makeEl(): HTMLElement {
		return document.createElement("div");
	}

	it("clears text and classes for empty", () => {
		const el = makeEl();
		el.classList.add("is-valid");
		renderDataviewQueryStatus(el, "empty");
		expect(el.textContent).toBe("");
		expect(el.className).toBe("");
	});

	it("shows a green checkmark for valid", () => {
		const el = makeEl();
		renderDataviewQueryStatus(el, "valid");
		expect(el.classList.contains("is-valid")).toBe(true);
		expect(el.textContent).toContain("✓");
	});

	it("shows the error message for invalid", () => {
		const el = makeEl();
		renderDataviewQueryStatus(el, "invalid", "unexpected token");
		expect(el.classList.contains("is-invalid")).toBe(true);
		expect(el.textContent).toBe("unexpected token");
	});

	it("shows an unavailable notice when dataview isn't installed", () => {
		const el = makeEl();
		renderDataviewQueryStatus(el, "unavailable");
		expect(el.classList.contains("is-unavailable")).toBe(true);
		expect(el.textContent).toMatch(/not available/i);
	});
});
