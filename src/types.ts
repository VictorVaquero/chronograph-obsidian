import { TimelineDate, TimelineDatePrecision } from "./timeline-date";

export const TIMELINE_VIEW_TYPE = "timeline-graph-view";

export interface TimelineEvent {
	id: string;
	title: string;
	date: TimelineDate;
	endDate?: TimelineDate;
	sourcePath: string;
	description?: string;
	group?: string;
	color?: string;
}

export type TimelineSortOrder = "asc" | "desc";

export type TimelineLayout = "vertical" | "horizontal";

export type { TimelineDatePrecision } from "./timeline-date";

export interface TimelineFieldMapping {
	/** Frontmatter/inline field holding the event start date. */
	dateField: string;
	/** Optional field holding an end date, for ranged events. */
	endDateField?: string;
	/** Field used as the event title; falls back to note title. */
	titleField?: string;
	/** Field used as the event description/body preview. */
	descriptionField?: string;
	/** Field used to group/color events (e.g. a category). */
	groupField?: string;
}

export interface TimelineViewConfig {
	id: string;
	name: string;
	/** Dataview Query Language source string, e.g. `FROM "Journal"`. */
	dataviewQuery: string;
	fields: TimelineFieldMapping;
	sortOrder: TimelineSortOrder;
	layout: TimelineLayout;
	/** Display/bucketing granularity, e.g. "day" for exact dates, "century" for ancient history. */
	datePrecision: TimelineDatePrecision;
}

export interface TimelineGraphSettings {
	views: TimelineViewConfig[];
	defaultViewId: string | null;
}
