import {
	TimelineCardSide,
	TimelineDatePrecision,
	TimelineFieldMapping,
	TimelineLayout,
	TimelineLineStyle,
	TimelineSortOrder,
	TimelineSourceType,
} from "../types";

export class TimelineCodeBlockParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TimelineCodeBlockParseError";
	}
}

export interface TimelineCodeBlockConfig {
	sourceType: TimelineSourceType;
	/** Dataview Query Language source string. Used when sourceType is "dataview". */
	dataviewQuery: string;
	/** Vault path of the note whose body contains the events table. Used when sourceType is "table"; empty means the embedding note itself. */
	tableNotePath: string;
	/** Only include notes carrying this tag. Used when sourceType is "frontmatter" or "tasks". */
	frontmatterTag: string;
	/** Only include notes under this vault folder path. Used when sourceType is "frontmatter" or "tasks". */
	frontmatterFolder: string;
	layout: TimelineLayout;
	precision: TimelineDatePrecision;
	sortOrder: TimelineSortOrder;
	verticalCardSide: TimelineCardSide;
	verticalLineStyle: TimelineLineStyle;
	fields: TimelineFieldMapping;
}

// Defaults let a block work with zero settings header: a table with columns
// named "date", "title", etc. renders with no configuration at all, matching
// the zero-setup usage that in-note code-block timelines are meant to offer.
export function defaultCodeBlockConfig(): TimelineCodeBlockConfig {
	return {
		sourceType: "table",
		dataviewQuery: "",
		tableNotePath: "",
		frontmatterTag: "",
		frontmatterFolder: "",
		layout: "vertical",
		precision: "day",
		sortOrder: "asc",
		verticalCardSide: "alternate",
		verticalLineStyle: "solid",
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
	};
}

const VALID_SOURCE_TYPES = new Set<TimelineSourceType>(["table", "dataview", "frontmatter", "tasks"]);
const VALID_LAYOUTS = new Set<TimelineLayout>(["vertical", "horizontal"]);
const VALID_PRECISIONS = new Set<TimelineDatePrecision>([
	"day", "month", "year", "decade", "century", "millennium",
]);
const VALID_SORT_ORDERS = new Set<TimelineSortOrder>(["asc", "desc"]);
const VALID_CARD_SIDES = new Set<TimelineCardSide>(["alternate", "left", "right"]);
const VALID_LINE_STYLES = new Set<TimelineLineStyle>(["solid", "dashed", "dotted"]);

const FIELD_KEYS: Record<string, keyof TimelineFieldMapping> = {
	datefield: "dateField",
	enddatefield: "endDateField",
	titlefield: "titleField",
	descriptionfield: "descriptionField",
	groupfield: "groupField",
	colorfield: "colorField",
	kindfield: "kindField",
	pointstofield: "pointsToField",
};

// Applies one "key: value" settings-header line to `config`, mutating it in
// place. Unknown keys are ignored rather than erroring, so a typo in an
// optional setting doesn't break the whole block. `value` is taken raw (not
// lowercased) since query strings, paths, and tags are case-sensitive.
function applySettingLine(config: TimelineCodeBlockConfig, key: string, rawValue: string): void {
	const k = key.trim().toLowerCase();
	const v = rawValue.trim();
	if (!v) return;
	const vLower = v.toLowerCase();

	if (k === "source" && VALID_SOURCE_TYPES.has(vLower as TimelineSourceType)) {
		config.sourceType = vLower as TimelineSourceType;
	} else if (k === "query") {
		config.dataviewQuery = v;
	} else if (k === "path") {
		config.tableNotePath = v;
	} else if (k === "tag") {
		config.frontmatterTag = v;
	} else if (k === "folder") {
		config.frontmatterFolder = v;
	} else if (k === "layout" && VALID_LAYOUTS.has(vLower as TimelineLayout)) {
		config.layout = vLower as TimelineLayout;
	} else if (k === "precision" && VALID_PRECISIONS.has(vLower as TimelineDatePrecision)) {
		config.precision = vLower as TimelineDatePrecision;
	} else if (k === "sort" && VALID_SORT_ORDERS.has(vLower as TimelineSortOrder)) {
		config.sortOrder = vLower as TimelineSortOrder;
	} else if (k === "cardside" && VALID_CARD_SIDES.has(vLower as TimelineCardSide)) {
		config.verticalCardSide = vLower as TimelineCardSide;
	} else if (k === "linestyle" && VALID_LINE_STYLES.has(vLower as TimelineLineStyle)) {
		config.verticalLineStyle = vLower as TimelineLineStyle;
	} else if (k in FIELD_KEYS) {
		config.fields[FIELD_KEYS[k]] = v;
	}
}

/**
 * Splits a `chronograph` code-block source into an optional YAML-ish
 * settings header and the markdown table body. A lone "---" line on its own
 * separates the two; if no such line exists, the whole source is scanned for
 * settings lines *and* used as the table body — a source/query/tag/folder
 * header (which needs no body) and a header-less inline table (which has no
 * settings lines) both parse correctly this way, since table rows don't
 * contain the "key: value" shape the header scan looks for.
 */
function splitHeaderAndBody(source: string): { header: string; body: string } {
	const lines = source.split(/\r?\n/);
	const dividerIndex = lines.findIndex((line) => line.trim() === "---");
	if (dividerIndex === -1) return { header: source, body: source };
	return {
		header: lines.slice(0, dividerIndex).join("\n"),
		body: lines.slice(dividerIndex + 1).join("\n"),
	};
}

/**
 * Parses a `chronograph` fenced code-block's settings header (and, for the
 * default "table" source, its inline markdown table body) into a config.
 * For the "table" source with no explicit `path`, `body` is the events
 * table content itself, embedded directly in the block. For the other
 * source types, `body` is unused — events come from elsewhere in the vault,
 * resolved separately by `resolveCodeBlockEvents`.
 */
export function parseCodeBlockConfig(source: string): { config: TimelineCodeBlockConfig; body: string } {
	const config = defaultCodeBlockConfig();
	const { header, body } = splitHeaderAndBody(source);

	for (const line of header.split(/\r?\n/)) {
		const colonIndex = line.indexOf(":");
		if (colonIndex === -1) continue;
		applySettingLine(config, line.slice(0, colonIndex), line.slice(colonIndex + 1));
	}

	return { config, body };
}
