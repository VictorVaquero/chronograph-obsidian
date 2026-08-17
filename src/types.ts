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
	/**
	 * Title of another event in the same view to draw a connecting arrow
	 * toward (horizontal layout only). Matched case-insensitively against
	 * event titles; unresolved references are silently skipped.
	 */
	pointsTo?: string;
}

export type TimelineSortOrder = "asc" | "desc";

/** "dataview" queries pages across the vault via Dataview. "table" reads a
 * markdown table from a single configured note instead. "frontmatter" scans
 * vault notes directly via Obsidian's own metadata cache (no Dataview
 * dependency), filtered by tag and/or folder. */
export type TimelineSourceType = "dataview" | "table" | "frontmatter";

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
	/** Field holding an explicit event color (any valid CSS color); overrides the color derived from groupField. */
	colorField?: string;
	/** Field whose value ("event" | "period" | "marker") selects the render kind; unset/unrecognized values default to "event". */
	kindField?: string;
	/** Field holding the title of another event this one points to, drawn as a connecting arrow (horizontal layout only). */
	pointsToField?: string;
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
	/** Only include notes carrying this tag (with or without a leading "#"), e.g. "event". Used when sourceType is "frontmatter"; leave empty to skip tag filtering. */
	frontmatterTag: string;
	/** Only include notes under this vault folder path, e.g. "Journal". Used when sourceType is "frontmatter"; leave empty to skip folder filtering. */
	frontmatterFolder: string;
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

/** Which optional groups of advanced per-view settings are shown in the settings tab. Each is off by default so new views only ask for a name, source, and date field. */
export interface TimelineAdvancedFeatures {
	/** End date, title, group, color, kind, and points-to field mappings. */
	extraFields: boolean;
	/** Layout, vertical card side, and vertical spine line style. */
	layoutAndStyle: boolean;
	/** Sort order and date granularity. */
	sortAndGranularity: boolean;
	/** Default-view toggle, relevant once a vault has more than one view. */
	multiView: boolean;
}

export interface TimelineGraphSettings {
	views: TimelineViewConfig[];
	defaultViewId: string | null;
	advanced: TimelineAdvancedFeatures;
}
