import { App, TFile, getAllTags } from "obsidian";
import { TimelineEvent, TimelineEventKind, TimelineFieldMapping } from "../types";
import { parseTimelineDate } from "../date/timeline-date";

function normalizeTag(tag: string): string {
	const trimmed = tag.trim();
	return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function matchesTag(app: App, file: TFile, tag: string): boolean {
	const cache = app.metadataCache.getFileCache(file);
	if (!cache) return false;
	const tags = getAllTags(cache) ?? [];
	return tags.some((t) => t.toLowerCase() === tag.toLowerCase());
}

function matchesFolder(file: TFile, folder: string): boolean {
	const normalized = folder.trim().replace(/^\/+|\/+$/g, "");
	if (!normalized) return true;
	return file.path === normalized || file.path.startsWith(`${normalized}/`);
}

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

function frontmatterToEvent(
	file: TFile,
	frontmatter: Record<string, unknown>,
	fields: TimelineFieldMapping
): TimelineEvent | null {
	const date = parseTimelineDate(frontmatter[fields.dateField]);
	if (!date) return null;

	const endDate = fields.endDateField ? parseTimelineDate(frontmatter[fields.endDateField]) : undefined;
	const title = (fields.titleField && fieldToString(frontmatter[fields.titleField])) || file.basename;
	const description = fields.descriptionField ? fieldToString(frontmatter[fields.descriptionField]) : undefined;
	const group = fields.groupField ? fieldToString(frontmatter[fields.groupField]) : undefined;
	const color = fields.colorField ? fieldToString(frontmatter[fields.colorField]) : undefined;
	const kind = fields.kindField ? toTimelineEventKind(frontmatter[fields.kindField]) : "event";
	const pointsTo = fields.pointsToField ? fieldToString(frontmatter[fields.pointsToField]) : undefined;

	return {
		id: file.path,
		title,
		date,
		endDate,
		sourcePath: file.path,
		description,
		group,
		color,
		kind,
		pointsTo,
	};
}

/**
 * Scans vault notes directly via Obsidian's metadata cache — no Dataview
 * dependency. Notes are optionally filtered by tag and/or folder, then
 * mapped into TimelineEvents from their frontmatter using the given field
 * mapping. Notes missing the configured date field are dropped.
 */
export function queryTimelineEventsFromFrontmatter(
	app: App,
	tag: string,
	folder: string,
	fields: TimelineFieldMapping
): TimelineEvent[] {
	const normalizedTag = tag.trim() ? normalizeTag(tag) : "";

	const events: TimelineEvent[] = [];
	for (const file of app.vault.getMarkdownFiles()) {
		if (normalizedTag && !matchesTag(app, file, normalizedTag)) continue;
		if (!matchesFolder(file, folder)) continue;

		const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
		if (!frontmatter) continue;

		const event = frontmatterToEvent(file, frontmatter, fields);
		if (event) events.push(event);
	}
	return events;
}
