import { App } from "obsidian";
import { DataviewApi, DataviewPage, DataviewPluginLike } from "./dataview-api";
import { TimelineEvent, TimelineFieldMapping } from "./types";
import { TimelineDate, parseTimelineDate } from "./timeline-date";

export class DataviewUnavailableError extends Error {
	constructor() {
		super(
			"Dataview is not installed or enabled. Timeline Graph uses Dataview as its query backend."
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
		typeof (value as { toMillis: unknown }).toMillis === "function"
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
		return String(value);
	}
	return undefined;
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

	return {
		id: page.file.path,
		title,
		date,
		endDate,
		sourcePath: page.file.path,
		description,
		group,
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
