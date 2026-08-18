import { App, Events } from "obsidian";
import { DataviewApi, DataviewPage, DataviewPluginLike } from "./dataview-api";
import { TimelineEvent, TimelineEventKind, TimelineFieldMapping } from "../types";
import { TimelineDate, parseTimelineDate } from "../date/timeline-date";
import { log } from "../log";

// Dataview triggers this on `app.workspace` once its initial vault index
// finishes (which happens asynchronously, after Obsidian may have already
// rendered dataview-source blocks/views once) and again after every
// subsequent metadata change. Its own built-in query views listen for it to
// know when to re-render.
export const DATAVIEW_REFRESH_EVENT = "dataview:refresh-views";

/**
 * Listens for Dataview's index-ready/refresh signal. `Workspace`'s own
 * typings declare a closed list of event-name overloads (inherited from
 * `Events`, whose generic `on(name: string, ...)` catch-all they shadow
 * rather than extend), so a third-party plugin event like this one has to
 * go through the base `Events.on` signature directly to typecheck.
 */
export function onDataviewRefresh(app: App, callback: () => void): ReturnType<Events["on"]> {
	return (app.workspace as unknown as Events).on(DATAVIEW_REFRESH_EVENT, callback);
}

export class DataviewUnavailableError extends Error {
	constructor() {
		super(
			"Dataview is not installed or enabled. Chronograph uses Dataview as its query backend."
		);
		this.name = "DataviewUnavailableError";
	}
}

export function getDataviewApi(app: App): DataviewApi | null {
	const plugin = (app as unknown as {
		plugins: { plugins: Record<string, unknown> };
	}).plugins.plugins["dataview"] as DataviewPluginLike | undefined;

	return plugin?.api ?? null;
}

export function isDataviewEnabled(app: App): boolean {
	return getDataviewApi(app) !== null;
}

function toTimelineDate(value: unknown): TimelineDate | undefined {
	if (value == null) return undefined;

	// Dataview DateTime (luxon) values expose `toMillis`.
	if (
		typeof value === "object" &&
		value !== null &&
		"toMillis" in value &&
		typeof (value).toMillis === "function"
	) {
		return parseTimelineDate((value as { toMillis: () => number }).toMillis());
	}

	return parseTimelineDate(value);
}

function fieldToString(value: unknown): string | undefined {
	if (value == null) return undefined;
	if (typeof value === "string") return value;
	if (
		typeof value === "object" &&
		"toString" in value &&
		typeof (value as { toString: unknown }).toString === "function"
	) {
		// Dataview values (Link, DateTime, ...) override toString with a
		// meaningful representation; plain objects intentionally degrade to
		// the default "[object Object]" rather than being dropped.
		// eslint-disable-next-line @typescript-eslint/no-base-to-string -- Dataview values may override toString; plain objects intentionally degrade to the default representation.
		return String(value);
	}
	return undefined;
}

const VALID_KINDS = new Set<TimelineEventKind>(["event", "period", "marker"]);

function toTimelineEventKind(value: unknown): TimelineEventKind {
	const str = fieldToString(value)?.toLowerCase();
	return str && VALID_KINDS.has(str as TimelineEventKind) ? (str as TimelineEventKind) : "event";
}

// Dataview's public query() API returns "table" results as positional row
// arrays (one entry per selected column, in `headers` order, with column 0
// always the implicit File link) rather than field-keyed objects — unlike
// "list"/"task" results, which are already DataviewPage-shaped. This folds
// a raw row of either shape into a DataviewPage-like object so the rest of
// this file can keep doing plain `page[fieldName]` lookups either way.
function normalizeRow(row: unknown, headers: string[] | undefined): DataviewPage {
	if (!Array.isArray(row)) return row as DataviewPage;

	const page: Record<string, unknown> = { file: row[0] };
	if (headers) {
		for (let i = 1; i < headers.length; i++) {
			page[headers[i]] = row[i];
		}
	}
	return page as unknown as DataviewPage;
}

// `page.file` is object-shaped ({path, name, ...}) for "list"/"task" results,
// but for "table" results it's Dataview's raw Link object, which has `.path`
// but no `.name` — so the basename is always derived from `.path` here
// rather than trusting a `.name` property that may not exist.
function fileBasename(file: DataviewPage["file"]): string {
	const path = file?.path ?? "";
	const withoutExt = path.replace(/\.[^./]+$/, "");
	const slashIndex = withoutExt.lastIndexOf("/");
	return slashIndex === -1 ? withoutExt : withoutExt.slice(slashIndex + 1);
}

function pageToEvent(
	page: DataviewPage,
	fields: TimelineFieldMapping
): TimelineEvent | null {
	const date = toTimelineDate(page[fields.dateField]);
	if (date === undefined) return null;

	const endDate = fields.endDateField
		? toTimelineDate(page[fields.endDateField])
		: undefined;

	const title =
		(fields.titleField && fieldToString(page[fields.titleField])) ||
		fileBasename(page.file);

	const description = fields.descriptionField
		? fieldToString(page[fields.descriptionField])
		: undefined;

	const group = fields.groupField
		? fieldToString(page[fields.groupField])
		: undefined;

	const kind = fields.kindField ? toTimelineEventKind(page[fields.kindField]) : "event";

	const color = fields.colorField ? fieldToString(page[fields.colorField]) : undefined;

	const pointsTo = fields.pointsToField ? fieldToString(page[fields.pointsToField]) : undefined;

	return {
		id: page.file.path,
		title,
		date,
		endDate,
		sourcePath: page.file.path,
		description,
		group,
		kind,
		color,
		pointsTo,
	};
}

/**
 * Runs a Dataview Query Language (DQL) source string and maps the
 * resulting pages into TimelineEvents using the given field mapping.
 * Pages missing the configured date field are dropped.
 */
export async function queryTimelineEvents(
	app: App,
	dataviewQuery: string,
	fields: TimelineFieldMapping
): Promise<TimelineEvent[]> {
	const api = getDataviewApi(app);
	if (!api) {
		log.warn("Dataview query attempted but Dataview is unavailable", { dataviewQuery });
		throw new DataviewUnavailableError();
	}

	log.debug("Running Dataview query", { dataviewQuery });
	const result = await api.query(dataviewQuery);
	if (!result.successful) {
		log.error("Dataview query failed", { dataviewQuery, error: result.error });
		throw new Error(`Dataview query failed: ${result.error}`);
	}
	const events: TimelineEvent[] = [];
	for (const row of result.value.values) {
		const page = normalizeRow(row, result.value.headers);
		const event = pageToEvent(page, fields);
		if (event) events.push(event);
	}
	log.debug("Dataview query resolved", { dataviewQuery, pages: result.value.values.length, events: events.length });
	return events;
}
