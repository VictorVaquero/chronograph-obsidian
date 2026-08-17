import { describe, expect, it } from "vitest";
import { createDefaultView, DEFAULT_SETTINGS } from "./settings";

describe("createDefaultView", () => {
	it("returns a view configured for a Dataview query over all notes", () => {
		const view = createDefaultView();
		expect(view.name).toBe("All notes");
		expect(view.sourceType).toBe("dataview");
		expect(view.dataviewQuery).toBe('FROM ""');
		expect(view.fields).toEqual({ dateField: "date" });
		expect(view.sortOrder).toBe("asc");
		expect(view.layout).toBe("vertical");
	});

	it("assigns a unique id on each call", () => {
		const a = createDefaultView();
		const b = createDefaultView();
		expect(a.id).not.toBe(b.id);
	});
});

describe("DEFAULT_SETTINGS", () => {
	it("starts with no views and no default view", () => {
		expect(DEFAULT_SETTINGS.views).toEqual([]);
		expect(DEFAULT_SETTINGS.defaultViewId).toBeNull();
	});
});
