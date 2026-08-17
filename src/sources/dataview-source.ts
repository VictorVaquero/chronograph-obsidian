import { App } from "obsidian";
import { DataviewApi, DataviewPage, DataviewPluginLike } from "./dataview-api";
import { TimelineEvent, TimelineEventKind, TimelineFieldMapping } from "../types";
import { TimelineDate, parseTimelineDate } from "../date/timeline-date";

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
		page.file.name;

	const description = fields.descriptionField
		? fieldToString(page[fields.descriptionField])
		: undefined;

	const group = fields.groupField
		? fieldToString(page[fields.groupField])
		: undefined;

	const kind = fields.kindField ? toTimelineEventKind(page[fields.kindField]) : "event";

	const color = fields.colorField ? fieldToString(page[fields.colorField]) : undefined;

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
	if (!api) throw new DataviewUnavailableError();

	const result = await api.query(dataviewQuery);
	if (!result.successful) {
		throw new Error(`Dataview query failed: ${result.error}`);
	}

	const events: TimelineEvent[] = [];
	for (const page of result.value.values) {
		const event = pageToEvent(page, fields);
		if (event) events.push(event);
	}
	return events;
}
