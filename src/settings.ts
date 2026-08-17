import { TimelineGraphSettings, TimelineViewConfig } from "./types";

// Same field names as defaultCodeBlockConfig() in sources/code-block-source.ts,
// so a table/frontmatter note using these column/frontmatter keys works with
// zero configuration, whether it's rendered via a configured view or a
// zero-setup ```chronograph code block. These match common conventions used
// by other note-taking/journaling plugins (plain "date"/"title", "enddate"
// for a range end), not a formal interop standard.
export function createDefaultView(): TimelineViewConfig {
	return {
		id: crypto.randomUUID(),
		name: "All notes",
		sourceType: "dataview",
		dataviewQuery: 'FROM ""',
		tableNotePath: "",
		frontmatterTag: "",
		frontmatterFolder: "",
		fields: {
			dateField: "date",
			endDateField: "enddate",
			titleField: "title",
			descriptionField: "description",
			groupField: "group",
			colorField: "color",
			kindField: "kind",
			pointsToField: "pointsto",
		},
		sortOrder: "asc",
		layout: "vertical",
		datePrecision: "day",
		verticalCardSide: "alternate",
		verticalLineStyle: "solid",
	};
}

export const DEFAULT_SETTINGS: TimelineGraphSettings = {
	views: [],
	defaultViewId: null,
	advanced: {
		extraFields: false,
		layoutAndStyle: false,
		sortAndGranularity: false,
		multiView: false,
	},
};
