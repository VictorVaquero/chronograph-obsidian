import {
	TimelineCardRadius,
	TimelineCardSide,
	TimelineDatePrecision,
	TimelineDensity,
	TimelineFieldMapping,
	TimelineLayout,
	TimelineLineStyle,
	TimelineMarkerSize,
	TimelineShadowIntensity,
	TimelineSortOrder,
	TimelineSourceType,
	TimelineSpineThickness,
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
	/** Card padding, node margin, and lane min-height preset. */
	density: TimelineDensity;
	/** Corner-radius preset for cards, tooltips, and badges. */
	cardRadius: TimelineCardRadius;
	/** Diameter preset for the vertical spine dot and horizontal point marker. */
	markerSize: TimelineMarkerSize;
	/** Thickness preset for the vertical spine line and horizontal connector. */
	spineThickness: TimelineSpineThickness;
	/** Elevation preset for card/tooltip shadows. */
	shadowIntensity: TimelineShadowIntensity;
	/** Max block height in pixels before it scrolls internally, or "fill" to grow with content and disable the inner scrollbar. */
	height: number | "fill";
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
		density: "comfortable",
		cardRadius: "medium",
		markerSize: "medium",
		spineThickness: "medium",
		shadowIntensity: "subtle",
		// Vertical (this default's layout) reads naturally at full length;
		// resolved again post-parse in parseCodeBlockConfig to track a
		// header's `layout` override too.
		height: "fill",
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
const VALID_DENSITIES = new Set<TimelineDensity>(["compact", "comfortable", "spacious"]);
const VALID_CARD_RADII = new Set<TimelineCardRadius>(["none", "small", "medium", "large"]);
const VALID_MARKER_SIZES = new Set<TimelineMarkerSize>(["small", "medium", "large"]);
const VALID_SPINE_THICKNESSES = new Set<TimelineSpineThickness>(["thin", "medium", "thick"]);
const VALID_SHADOW_INTENSITIES = new Set<TimelineShadowIntensity>(["none", "subtle", "normal"]);

function isValidHeightValue(raw: string): boolean {
	const v = raw.trim().toLowerCase();
	return v === "fill" || (/^\d+$/.test(v) && Number(v) > 0);
}

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
	} else if (k === "density" && VALID_DENSITIES.has(vLower as TimelineDensity)) {
		config.density = vLower as TimelineDensity;
	} else if (k === "cardradius" && VALID_CARD_RADII.has(vLower as TimelineCardRadius)) {
		config.cardRadius = vLower as TimelineCardRadius;
	} else if (k === "markersize" && VALID_MARKER_SIZES.has(vLower as TimelineMarkerSize)) {
		config.markerSize = vLower as TimelineMarkerSize;
	} else if (k === "spinethickness" && VALID_SPINE_THICKNESSES.has(vLower as TimelineSpineThickness)) {
		config.spineThickness = vLower as TimelineSpineThickness;
	} else if (k === "shadowintensity" && VALID_SHADOW_INTENSITIES.has(vLower as TimelineShadowIntensity)) {
		config.shadowIntensity = vLower as TimelineShadowIntensity;
	} else if (k === "height" && isValidHeightValue(v)) {
		config.height = vLower === "fill" ? "fill" : Number(v);
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

const SETTING_LINE_PATTERN = /^[A-Za-z][\w-]*\s*:/;

function looksLikeSettingLine(line: string): boolean {
	return SETTING_LINE_PATTERN.test(line.trim());
}

// Rewrites the settings-header lines identified by `applySettingLine`,
// touching only the given keys and leaving everything else — other header
// lines, the "---" divider (if any), and the whole table/query body —
// byte-for-byte untouched. Used by the code-block "Configure" button to save
// a minimal diff back into the note instead of regenerating the header from
// the fully-resolved (and therefore default-filled) config object, which
// would clobber user formatting and any settings this feature doesn't know
// about.
export function upsertSettingLines(source: string, changes: Record<string, string>): string {
	const { header, body } = splitHeaderAndBody(source);
	const hasDivider = source.split(/\r?\n/).some((line) => line.trim() === "---");
	const headerHasSettingLine = header.split(/\r?\n/).some(looksLikeSettingLine);

	if (!hasDivider && !headerHasSettingLine && source.trim() !== "") {
		// Case C: bare inline table (or other body-only source) with no
		// existing header at all — prepend a fresh header + divider.
		const newHeaderLines = Object.entries(changes).map(([key, value]) => `${key}: ${value}`);
		return `${newHeaderLines.join("\n")}\n---\n${source}`;
	}

	const rewrittenHeader = rewriteHeaderLines(header, changes);

	if (!hasDivider) {
		// Case B: no divider, and the whole source is settings (e.g. a
		// dataview header with no table body) — rewrite in place, no divider.
		return rewrittenHeader;
	}

	// Case A: explicit divider — only the header above it changes.
	return `${rewrittenHeader}\n---\n${body}`;
}

function rewriteHeaderLines(header: string, changes: Record<string, string>): string {
	const pending = new Map<string, string>();
	for (const [key, value] of Object.entries(changes)) {
		pending.set(key.toLowerCase(), value);
	}

	const lines = header.split(/\r?\n/).map((line) => {
		const colonIndex = line.indexOf(":");
		if (colonIndex === -1) return line;
		const k = line.slice(0, colonIndex).trim().toLowerCase();
		if (!pending.has(k)) return line;
		const value = pending.get(k)!;
		pending.delete(k);
		return `${line.slice(0, colonIndex)}: ${value}`;
	});

	for (const [key, value] of pending) {
		lines.push(`${key}: ${value}`);
	}

	return lines.join("\n");
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
	let heightExplicit = false;

	for (const line of header.split(/\r?\n/)) {
		const colonIndex = line.indexOf(":");
		if (colonIndex === -1) continue;
		const key = line.slice(0, colonIndex);
		applySettingLine(config, key, line.slice(colonIndex + 1));
		if (key.trim().toLowerCase() === "height" && isValidHeightValue(line.slice(colonIndex + 1))) {
			heightExplicit = true;
		}
	}

	// Vertical timelines read naturally at full length (like a normal note
	// embed); horizontal timelines pan along a fixed-height track, so they
	// keep the bounded/scrollable default. Only applies when the header
	// doesn't set `height` itself.
	if (!heightExplicit) {
		config.height = config.layout === "vertical" ? "fill" : 480;
	}

	return { config, body };
}
