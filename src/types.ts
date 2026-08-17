import { TimelineDate, TimelineDatePrecision } from "./date/timeline-date";

export const TIMELINE_VIEW_TYPE = "timeline-graph-view";

/**
 * "event" (default) is a normal lane marker/range. "period" renders as a
 * full-height translucent background band (e.g. an era spanning `date` to
 * `endDate`), drawn behind the lanes rather than inside one. "marker" is a
 * full-height flag line at `date`, like the built-in "today" line, for
 * calling out a single significant date independent of any lane.
 */
export type TimelineEventKind = "event" | "period" | "marker";

export interface TimelineEvent {
	id: string;
	title: string;
	date: TimelineDate;
	endDate?: TimelineDate;
	sourcePath: string;
	description?: string;
	group?: string;
	color?: string;
	kind?: TimelineEventKind;
}

export type TimelineSortOrder = "asc" | "desc";

/** "dataview" queries pages across the vault via Dataview. "table" reads a
 * markdown table from a single configured note instead. */
export type TimelineSourceType = "dataview" | "table";

export type TimelineLayout = "vertical" | "horizontal";

/** Which side of the spine vertical-layout cards are placed on. */
export type TimelineCardSide = "alternate" | "left" | "right";

/** Visual style of the vertical layout's central spine line. */
export type TimelineLineStyle = "solid" | "dashed" | "dotted";

export type { TimelineDatePrecision } from "./date/timeline-date";

export interface TimelineFieldMapping {
	/**
	 * Field holding the event start date: a Dataview frontmatter/inline field
	 * name for the "dataview" source, or a table column header (matched
	 * case-insensitively) for the "table" source.
	 */
	dateField: string;
	/** Optional field holding an end date, for ranged events. */
	endDateField?: string;
	/** Field used as the event title; falls back to note title. */
	titleField?: string;
	/** Field used as the event description/body preview. */
	descriptionField?: string;
	/** Field used to group/color events (e.g. a category). */
	groupField?: string;
	/** Field whose value ("event" | "period" | "marker") selects the render kind; unset/unrecognized values default to "event". */
	kindField?: string;
}

export interface TimelineViewConfig {
	id: string;
	name: string;
	/** Which backend supplies events for this view. */
	sourceType: TimelineSourceType;
	/** Dataview Query Language source string, e.g. `FROM "Journal"`. Used when sourceType is "dataview". */
	dataviewQuery: string;
	/** Vault path of the note whose body contains the events table, e.g. "Timeline/Events.md". Used when sourceType is "table". */
	tableNotePath: string;
	fields: TimelineFieldMapping;
	sortOrder: TimelineSortOrder;
	layout: TimelineLayout;
	/** Display/bucketing granularity, e.g. "day" for exact dates, "century" for ancient history. */
	datePrecision: TimelineDatePrecision;
	/** Vertical layout only: which side of the spine cards are placed on. */
	verticalCardSide: TimelineCardSide;
	/** Vertical layout only: visual style of the central spine line. */
	verticalLineStyle: TimelineLineStyle;
}

export interface TimelineGraphSettings {
	views: TimelineViewConfig[];
	defaultViewId: string | null;
}
