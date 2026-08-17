import { App, TFile } from "obsidian";
import { TimelineEvent, TimelineEventKind, TimelineFieldMapping } from "../types";
import { parseTimelineDate } from "../date/timeline-date";

export class TimelineTableNotFoundError extends Error {
	constructor(notePath: string) {
		super(`Table note not found: "${notePath}". Set a valid note path in the view's settings.`);
		this.name = "TimelineTableNotFoundError";
	}
}

export class TimelineTableParseError extends Error {
	constructor(notePath: string) {
		super(
			`No markdown table found in "${notePath}". Add a table with a header row and a "---" divider row.`
		);
		this.name = "TimelineTableParseError";
	}
}

const VALID_KINDS = new Set<TimelineEventKind>(["event", "period", "marker"]);

function toTimelineEventKind(value: string | undefined): TimelineEventKind {
	const str = value?.trim().toLowerCase();
	return str && VALID_KINDS.has(str as TimelineEventKind) ? (str as TimelineEventKind) : "event";
}

// Splits a single markdown table row into trimmed cell strings, honoring
// optional leading/trailing pipes and `\|` as an escaped literal pipe.
function splitTableRow(line: string): string[] {
	let l = line.trim();
	if (l.startsWith("|")) l = l.slice(1);
	if (l.endsWith("|")) l = l.slice(0, -1);

	const cells: string[] = [];
	let current = "";
	for (let i = 0; i < l.length; i++) {
		const ch = l[i];
		if (ch === "\\" && l[i + 1] === "|") {
			current += "|";
			i++;
			continue;
		}
		if (ch === "|") {
			cells.push(current.trim());
			current = "";
			continue;
		}
		current += ch;
	}
	cells.push(current.trim());
	return cells;
}

const DELIMITER_CELL_RE = /^:?-+:?$/;

export interface MarkdownTableLocation {
	headers: string[];
	/** 0-based line index of the `---` delimiter row. */
	delimiterLineIndex: number;
	/** 0-based line index of the last data row, or of the delimiter row itself if the table has no rows yet. */
	lastLineIndex: number;
}

/** Finds the first GFM-style table (header row + `---` delimiter row) in `content`, by line position. */
export function locateMarkdownTable(content: string): MarkdownTableLocation | null {
	const lines = content.split(/\r?\n/);

	for (let i = 0; i < lines.length - 1; i++) {
		const headerLine = lines[i];
		if (!headerLine.includes("|")) continue;

		const delimCells = splitTableRow(lines[i + 1]);
		if (delimCells.length === 0 || !delimCells.every((c) => DELIMITER_CELL_RE.test(c))) continue;

		const headers = splitTableRow(headerLine).map((h) => h.toLowerCase());
		let lastLineIndex = i + 1;
		for (let j = i + 2; j < lines.length; j++) {
			const rowLine = lines[j];
			if (rowLine.trim() === "" || !rowLine.includes("|")) break;
			lastLineIndex = j;
		}
		return { headers, delimiterLineIndex: i + 1, lastLineIndex };
	}

	return null;
}

function findMarkdownTable(content: string): { headers: string[]; rows: string[][] } | null {
	const lines = content.split(/\r?\n/);
	const location = locateMarkdownTable(content);
	if (!location) return null;

	const rows: string[][] = [];
	for (let j = location.delimiterLineIndex + 1; j <= location.lastLineIndex; j++) {
		rows.push(splitTableRow(lines[j]));
	}
	return { headers: location.headers, rows };
}

function cellFor(headers: string[], row: string[], fieldName: string | undefined): string | undefined {
	if (!fieldName) return undefined;
	const idx = headers.indexOf(fieldName.trim().toLowerCase());
	if (idx === -1) return undefined;
	const value = row[idx];
	return value ? value : undefined;
}

function rowToEvent(
	notePath: string,
	rowIndex: number,
	headers: string[],
	row: string[],
	fields: TimelineFieldMapping
): TimelineEvent | null {
	const dateStr = cellFor(headers, row, fields.dateField);
	const date = dateStr ? parseTimelineDate(dateStr) : undefined;
	if (!date) return null;

	const endDateStr = cellFor(headers, row, fields.endDateField);
	const endDate = endDateStr ? parseTimelineDate(endDateStr) : undefined;

	const title = cellFor(headers, row, fields.titleField) || `Event ${rowIndex + 1}`;
	const description = cellFor(headers, row, fields.descriptionField);
	const group = cellFor(headers, row, fields.groupField);
	const kind = toTimelineEventKind(cellFor(headers, row, fields.kindField));
	const color = cellFor(headers, row, fields.colorField);
	const pointsTo = cellFor(headers, row, fields.pointsToField);

	return {
		id: `${notePath}::row-${rowIndex}`,
		title,
		date,
		endDate,
		sourcePath: notePath,
		description,
		group,
		kind,
		color,
		pointsTo,
	};
}

/**
 * Parses the first markdown table found in `content` and maps its rows into
 * TimelineEvents using the given field mapping. Column headers are matched
 * case-insensitively against the configured field names, so a
 * `fields.dateField` of "date" matches a "Date" or "date" column. `sourcePath`
 * is used as each event's source note path (and id prefix) — the caller's
 * own note for a file-backed table, or the embedding note for an inline
 * code-block table. Returns null if `content` has no markdown table.
 */
export function parseTimelineEventsFromTableContent(
	content: string,
	sourcePath: string,
	fields: TimelineFieldMapping
): TimelineEvent[] | null {
	const table = findMarkdownTable(content);
	if (!table) return null;

	const events: TimelineEvent[] = [];
	table.rows.forEach((row, index) => {
		const event = rowToEvent(sourcePath, index, table.headers, row, fields);
		if (event) events.push(event);
	});
	return events;
}

/**
 * Reads the first markdown table found in `notePath`'s body and maps its
 * rows into TimelineEvents using the given field mapping. Column headers
 * are matched case-insensitively against the configured field names, so a
 * `fields.dateField` of "date" matches a "Date" or "date" column.
 */
export async function queryTimelineEventsFromTable(
	app: App,
	notePath: string,
	fields: TimelineFieldMapping
): Promise<TimelineEvent[]> {
	const file = app.vault.getAbstractFileByPath(notePath);
	if (!(file instanceof TFile)) throw new TimelineTableNotFoundError(notePath);

	const content = await app.vault.cachedRead(file);
	const events = parseTimelineEventsFromTableContent(content, notePath, fields);
	if (!events) throw new TimelineTableParseError(notePath);
	return events;
}
