import { describe, expect, it } from "vitest";
import { TimelineEvent } from "../types";
import {
	applyStyleVars,
	buildGroupColorMap,
	colorForEvent,
	groupsOf,
	renderEmptyState,
	renderErrorState,
} from "./render-shared";

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
	return {
		id: "id",
		title: "Title",
		date: { year: 2024 },
		sourcePath: "Note.md",
		...overrides,
	};
}

describe("buildGroupColorMap", () => {
	it("assigns palette slots in first-seen order", () => {
		const map = buildGroupColorMap(["Research", "Meetings", "Writing"], "light");
		expect([...map.keys()]).toEqual(["Research", "Meetings", "Writing"]);
		expect(new Set(map.values()).size).toBe(3);
	});

	it("is deterministic given the same groups and theme", () => {
		const a = buildGroupColorMap(["Research", "Meetings"], "light");
		const b = buildGroupColorMap(["Research", "Meetings"], "light");
		expect(a.get("Research")).toBe(b.get("Research"));
		expect(a.get("Meetings")).toBe(b.get("Meetings"));
	});

	it("gives every one of the first 8 groups a distinct color", () => {
		const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];
		const map = buildGroupColorMap(groups, "light");
		expect(new Set(map.values()).size).toBe(8);
	});

	it("falls back to a hash-derived color for the 9th+ group", () => {
		const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
		const map = buildGroupColorMap(groups, "light");
		expect(map.get("I")).toMatch(/^hsl\(\d+, 65%, 55%\)$/);
	});

	it("uses different hex values for light vs dark theme", () => {
		const light = buildGroupColorMap(["Research"], "light");
		const dark = buildGroupColorMap(["Research"], "dark");
		expect(light.get("Research")).not.toBe(dark.get("Research"));
	});

	it("returns an empty map for no groups", () => {
		expect(buildGroupColorMap([], "light").size).toBe(0);
	});
});

describe("colorForEvent", () => {
	it("prefers an explicit event color over the group color", () => {
		const map = buildGroupColorMap(["Research"], "light");
		const event = makeEvent({ group: "Research", color: "#ff8800" });
		expect(colorForEvent(event, map)).toBe("#ff8800");
	});

	it("falls back to the group's color when no explicit color is set", () => {
		const map = buildGroupColorMap(["Research"], "light");
		const event = makeEvent({ group: "Research" });
		expect(colorForEvent(event, map)).toBe(map.get("Research"));
	});

	it("returns undefined for an ungrouped, uncolored event", () => {
		const map = buildGroupColorMap([], "light");
		expect(colorForEvent(makeEvent(), map)).toBeUndefined();
	});
});

describe("groupsOf", () => {
	it("returns unique group names in first-seen order", () => {
		const events = [
			makeEvent({ group: "A" }),
			makeEvent({ group: "B" }),
			makeEvent({ group: "A" }),
		];
		expect(groupsOf(events)).toEqual(["A", "B"]);
	});

	it("treats events without a group as the empty-string group", () => {
		const events = [makeEvent({ group: undefined }), makeEvent({ group: "A" })];
		expect(groupsOf(events)).toEqual(["", "A"]);
	});

	it("returns an empty array for no events", () => {
		expect(groupsOf([])).toEqual([]);
	});
});

describe("applyStyleVars", () => {
	function propsOf(vars: Parameters<typeof applyStyleVars>[1]): Record<string, string> {
		const root = createDiv();
		applyStyleVars(root, vars);
		return {
			density: root.style.getPropertyValue("--timeline-density-gap"),
			cardRadius: root.style.getPropertyValue("--timeline-card-radius"),
			markerSize: root.style.getPropertyValue("--timeline-marker-size"),
			spineThickness: root.style.getPropertyValue("--timeline-spine-thickness"),
			shadow: root.style.getPropertyValue("--timeline-card-shadow"),
			shadowHover: root.style.getPropertyValue("--timeline-card-shadow-hover"),
		};
	}

	it("applies comfortable/medium/subtle defaults when no vars are given", () => {
		const props = propsOf({});
		expect(props.density).toBe("var(--size-4-3)");
		expect(props.cardRadius).toBe("var(--radius-m)");
		expect(props.markerSize).toBe("12px");
		expect(props.spineThickness).toBe("2px");
		expect(props.shadow).not.toBe("");
		expect(props.shadowHover).not.toBe("");
	});

	it("maps each density preset to a distinct gap value", () => {
		const compact = propsOf({ density: "compact" });
		const spacious = propsOf({ density: "spacious" });
		expect(compact.density).not.toBe(spacious.density);
	});

	it("maps cardRadius 'none' to 0px", () => {
		expect(propsOf({ cardRadius: "none" }).cardRadius).toBe("0px");
	});

	it("maps markerSize presets to distinct diameters", () => {
		expect(propsOf({ markerSize: "small" }).markerSize).toBe("9px");
		expect(propsOf({ markerSize: "large" }).markerSize).toBe("16px");
	});

	it("maps spineThickness presets to distinct widths", () => {
		expect(propsOf({ spineThickness: "thin" }).spineThickness).toBe("1px");
		expect(propsOf({ spineThickness: "thick" }).spineThickness).toBe("4px");
	});

	it("maps shadowIntensity 'none' to 'none' for both resting and hover shadow", () => {
		const props = propsOf({ shadowIntensity: "none" });
		expect(props.shadow).toBe("none");
		expect(props.shadowHover).toBe("none");
	});

	it("gives the hover shadow more elevation than the resting shadow for non-none intensities", () => {
		const subtle = propsOf({ shadowIntensity: "subtle" });
		const normal = propsOf({ shadowIntensity: "normal" });
		expect(subtle.shadowHover).not.toBe(subtle.shadow);
		expect(normal.shadowHover).not.toBe(normal.shadow);
	});
});

describe("renderEmptyState", () => {
	it("replaces container contents with an empty-state message", () => {
		const container = createDiv();
		container.appendChild(createSpan());
		renderEmptyState(container, "Nothing here");
		expect(container.querySelector(".timeline-graph-empty")).not.toBeNull();
		expect(container.textContent).toBe("Nothing here");
	});
});

describe("renderErrorState", () => {
	it("replaces container contents with a prefixed error message", () => {
		const container = createDiv();
		renderErrorState(container, "Dataview is not installed");
		expect(container.querySelector(".timeline-graph-error")).not.toBeNull();
		expect(container.textContent).toBe("Chronograph error: Dataview is not installed");
	});
});
