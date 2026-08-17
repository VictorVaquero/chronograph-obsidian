import { TimelineEvent, TimelineEventKind, TimelineFieldMapping } from "../types";
import { parseTimelineDate } from "../date/timeline-date";

// Mirrors the pure mapping logic in src/sources/frontmatter-source.ts against
// a small hand-authored mock vault, standing in for Obsidian's metadata
// cache (which doesn't exist in the standalone browser preview).

interface MockNote {
	path: string;
	tags: string[];
	frontmatter: Record<string, unknown>;
}

// Frontmatter keys here match createDefaultView()'s default field mapping
// (date, enddate, title, group, kind, ...) so this mock vault matches out of
// the box, the same way a real vault following that convention would.
export const MOCK_VAULT: MockNote[] = [
	{
		path: "Journal/2026-01-05.md",
		tags: ["#event", "#journal"],
		frontmatter: { date: "2026-01-05", title: "Kickoff meeting", group: "Meetings" },
	},
	{
		path: "Journal/2026-01-08.md",
		tags: ["#event", "#journal"],
		frontmatter: { date: "2026-01-08", enddate: "2026-01-15", title: "Literature review", group: "Research" },
	},
	{
		path: "Journal/2026-01-20.md",
		tags: ["#journal"],
		frontmatter: { date: "2026-01-20", title: "Draft outline", group: "Writing" },
	},
	{
		path: "Projects/Launch.md",
		tags: ["#event", "#project"],
		frontmatter: { date: "2026-02-10", title: "Public launch", kind: "marker" },
	},
	{
		path: "Projects/Sprint1.md",
		tags: ["#project"],
		frontmatter: { date: "2026-01-05", enddate: "2026-01-19", title: "Sprint 1", kind: "period" },
	},
];

const VALID_KINDS = new Set<TimelineEventKind>(["event", "period", "marker"]);

function toTimelineEventKind(value: unknown): TimelineEventKind {
	const str = typeof value === "string" ? value.trim().toLowerCase() : undefined;
	return str && VALID_KINDS.has(str as TimelineEventKind) ? (str as TimelineEventKind) : "event";
}

function fieldToString(value: unknown): string | undefined {
	if (value == null) return undefined;
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return undefined;
}

function normalizeTag(tag: string): string {
	const trimmed = tag.trim();
	return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function matchesFolder(path: string, folder: string): boolean {
	const normalized = folder.trim().replace(/^\/+|\/+$/g, "");
	if (!normalized) return true;
	return path === normalized || path.startsWith(`${normalized}/`);
}

function noteToEvent(note: MockNote, fields: TimelineFieldMapping): TimelineEvent | null {
	const date = parseTimelineDate(note.frontmatter[fields.dateField]);
	if (!date) return null;

	const endDate = fields.endDateField ? parseTimelineDate(note.frontmatter[fields.endDateField]) : undefined;
	const title =
		(fields.titleField && fieldToString(note.frontmatter[fields.titleField])) ||
		note.path.split("/").pop()!.replace(/\.md$/, "");
	const description = fields.descriptionField ? fieldToString(note.frontmatter[fields.descriptionField]) : undefined;
	const group = fields.groupField ? fieldToString(note.frontmatter[fields.groupField]) : undefined;
	const color = fields.colorField ? fieldToString(note.frontmatter[fields.colorField]) : undefined;
	const kind = fields.kindField ? toTimelineEventKind(note.frontmatter[fields.kindField]) : "event";
	const pointsTo = fields.pointsToField ? fieldToString(note.frontmatter[fields.pointsToField]) : undefined;

	return {
		id: note.path,
		title,
		date,
		endDate,
		sourcePath: note.path,
		description,
		group,
		color,
		kind,
		pointsTo,
	};
}

/** Filters the mock vault by tag/folder and maps matches into TimelineEvents,
 * mirroring queryTimelineEventsFromFrontmatter in src/sources/frontmatter-source.ts. */
export function queryMockFrontmatter(tag: string, folder: string, fields: TimelineFieldMapping): TimelineEvent[] {
	const normalizedTag = tag.trim() ? normalizeTag(tag) : "";

	const events: TimelineEvent[] = [];
	for (const note of MOCK_VAULT) {
		if (normalizedTag && !note.tags.some((t) => t.toLowerCase() === normalizedTag.toLowerCase())) continue;
		if (!matchesFolder(note.path, folder)) continue;

		const event = noteToEvent(note, fields);
		if (event) events.push(event);
	}
	return events;
}
