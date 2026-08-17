import {
	TimelineCardSide,
	TimelineDatePrecision,
	TimelineEvent,
	TimelineFieldMapping,
	TimelineLayout,
	TimelineLineStyle,
	TimelineSortOrder,
} from "../types";
import { parseTimelineEventsFromTableContent } from "./table-source";

export class TimelineCodeBlockParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TimelineCodeBlockParseError";
	}
}

export interface TimelineCodeBlockConfig {
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
// optional setting doesn't break the whole block.
function applySettingLine(config: TimelineCodeBlockConfig, key: string, value: string): void {
	const k = key.trim().toLowerCase();
	const v = value.trim();
	if (!v) return;

	if (k === "layout" && VALID_LAYOUTS.has(v as TimelineLayout)) {
		config.layout = v as TimelineLayout;
	} else if (k === "precision" && VALID_PRECISIONS.has(v as TimelineDatePrecision)) {
		config.precision = v as TimelineDatePrecision;
	} else if (k === "sort" && VALID_SORT_ORDERS.has(v as TimelineSortOrder)) {
		config.sortOrder = v as TimelineSortOrder;
	} else if (k === "cardside" && VALID_CARD_SIDES.has(v as TimelineCardSide)) {
		config.verticalCardSide = v as TimelineCardSide;
	} else if (k === "linestyle" && VALID_LINE_STYLES.has(v as TimelineLineStyle)) {
		config.verticalLineStyle = v as TimelineLineStyle;
	} else if (k in FIELD_KEYS) {
		config.fields[FIELD_KEYS[k]] = v;
	}
}

/**
 * Splits a `chronograph` code-block source into an optional YAML-ish
 * settings header and the markdown table body. A lone "---" line on its own
 * separates the two; if no such line exists, the whole source is treated as
 * the table body and defaults apply to every setting.
 */
function splitHeaderAndBody(source: string): { header: string; body: string } {
	const lines = source.split(/\r?\n/);
	const dividerIndex = lines.findIndex((line) => line.trim() === "---");
	if (dividerIndex === -1) return { header: "", body: source };
	return {
		header: lines.slice(0, dividerIndex).join("\n"),
		body: lines.slice(dividerIndex + 1).join("\n"),
	};
}

/**
 * Parses a `chronograph` fenced code-block's source into a config plus the
 * TimelineEvents from its inline markdown table. `sourcePath` is the
 * embedding note's path, used as each event's source/id.
 */
export function parseCodeBlock(
	source: string,
	sourcePath: string
): { config: TimelineCodeBlockConfig; events: TimelineEvent[] } {
	const config = defaultCodeBlockConfig();
	const { header, body } = splitHeaderAndBody(source);

	for (const line of header.split(/\r?\n/)) {
		const colonIndex = line.indexOf(":");
		if (colonIndex === -1) continue;
		applySettingLine(config, line.slice(0, colonIndex), line.slice(colonIndex + 1));
	}

	const events = parseTimelineEventsFromTableContent(body, sourcePath, config.fields);
	if (!events) {
		throw new TimelineCodeBlockParseError(
			'No markdown table found in this chronograph block. Add a table with a header row and a "---" divider row.'
		);
	}

	return { config, events };
}
