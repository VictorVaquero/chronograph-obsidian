import { TimelineGraphSettings, TimelineViewConfig } from "./types";

export function createDefaultView(): TimelineViewConfig {
	return {
		id: crypto.randomUUID(),
		name: "All notes",
		dataviewQuery: 'FROM ""',
		fields: {
			dateField: "date",
		},
		sortOrder: "asc",
	};
}

export const DEFAULT_SETTINGS: TimelineGraphSettings = {
	views: [],
	defaultViewId: null,
};
