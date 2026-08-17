import { TimelineEvent, TimelineEventKind, TimelineFieldMapping } from "../types";
import { parseTimelineDate } from "../date/timeline-date";

// A trimmed copy of the pure parsing logic in src/sources/table-source.ts,
// duplicated here because that file imports `App`/`TFile` from "obsidian" for
// its (unused-by-the-preview) file-reading wrapper, and the standalone
// preview bundle has no real "obsidian" module to resolve that import
// against. Keeps the dev harness's "Markdown table" source behaving exactly
// like the real table source as you type, without pulling in Obsidian types.

const VALID_KINDS = new Set<TimelineEventKind>(["event", "period", "marker"]);

function toTimelineEventKind(value: string | undefined): TimelineEventKind {
	const str = value?.trim().toLowerCase();
	return str && VALID_KINDS.has(str as TimelineEventKind) ? (str as TimelineEventKind) : "event";
}

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

function findMarkdownTable(content: string): { headers: string[]; rows: string[][] } | null {
	const lines = content.split(/\r?\n/);

	for (let i = 0; i < lines.length - 1; i++) {
		const headerLine = lines[i];
		if (!headerLine.includes("|")) continue;

		const delimCells = splitTableRow(lines[i + 1]);
		if (delimCells.length === 0 || !delimCells.every((c) => DELIMITER_CELL_RE.test(c))) continue;

		const headers = splitTableRow(headerLine).map((h) => h.toLowerCase());
		const rows: string[][] = [];
		for (let j = i + 2; j < lines.length; j++) {
			const rowLine = lines[j];
			if (rowLine.trim() === "" || !rowLine.includes("|")) break;
			rows.push(splitTableRow(rowLine));
		}
		return { headers, rows };
	}

	return null;
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

export class MockTableParseError extends Error {
	constructor() {
		super('No markdown table found. Add a table with a header row and a "---" divider row.');
		this.name = "MockTableParseError";
	}
}

/** Parses the first markdown table in `content` into TimelineEvents, mirroring
 * parseTimelineEventsFromTableContent in src/sources/table-source.ts. */
export function parseMockTable(content: string, fields: TimelineFieldMapping): TimelineEvent[] {
	const table = findMarkdownTable(content);
	if (!table) throw new MockTableParseError();

	const events: TimelineEvent[] = [];
	table.rows.forEach((row, index) => {
		const event = rowToEvent("Timeline/Events.md", index, table.headers, row, fields);
		if (event) events.push(event);
	});
	return events;
}
