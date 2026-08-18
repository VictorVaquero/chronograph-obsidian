import { describe, expect, it } from "vitest";
import { createDefaultView, DEFAULT_SETTINGS } from "./settings";

describe("createDefaultView", () => {
	it("returns a view configured for a Dataview query over all notes", () => {
		const view = createDefaultView();
		expect(view.name).toBe("All notes");
		expect(view.sourceType).toBe("dataview");
		expect(view.dataviewQuery).toBe('FROM ""');
		expect(view.fields).toEqual({
			dateField: "date",
			endDateField: "enddate",
			titleField: "title",
			descriptionField: "description",
			groupField: "group",
			colorField: "color",
			kindField: "kind",
			pointsToField: "pointsto",
		});
		expect(view.sortOrder).toBe("asc");
		expect(view.layout).toBe("vertical");
		expect(view.density).toBe("comfortable");
		expect(view.cardRadius).toBe("medium");
		expect(view.markerSize).toBe("medium");
		expect(view.spineThickness).toBe("medium");
		expect(view.shadowIntensity).toBe("subtle");
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

	it("starts with all advanced feature groups off", () => {
		expect(DEFAULT_SETTINGS.advanced).toEqual({
			extraFields: false,
			layoutAndStyle: false,
			sortAndGranularity: false,
			multiView: false,
			styleOverrides: false,
		});
	});
});
