import { App, TFile, getAllTags } from "obsidian";
import { TimelineEvent } from "../types";
import { parseTimelineDate } from "../date/timeline-date";
import { log } from "../log";

// Obsidian Tasks plugin emoji-date syntax: https://publish.obsidian.md/tasks/
const DUE_DATE_RE = /📅\s*(\d{4}-\d{2}-\d{2})/;
const START_DATE_RE = /🛫\s*(\d{4}-\d{2}-\d{2})/;
const SCHEDULED_DATE_RE = /⏳\s*(\d{4}-\d{2}-\d{2})/;
const DONE_DATE_RE = /✅\s*(\d{4}-\d{2}-\d{2})/;
const TASK_LINE_RE = /^\s*[-*]\s*\[( |x|X)\]\s*(.*)$/;

// Strips every recognized emoji-date marker (and any other trailing task
// metadata emoji Tasks defines, e.g. priority/recurrence) so the remaining
// text reads as a plain title.
const METADATA_RE =
	/(📅|🛫|⏳|✅|➕|🔁)\s*\S+|([🔺⏫🔼🔽⏬])/gu;

function extractTaskDate(line: string): { date: string; done: boolean } | null {
	const due = DUE_DATE_RE.exec(line);
	if (due) return { date: due[1], done: false };
	const scheduled = SCHEDULED_DATE_RE.exec(line);
	if (scheduled) return { date: scheduled[1], done: false };
	const start = START_DATE_RE.exec(line);
	if (start) return { date: start[1], done: false };
	const done = DONE_DATE_RE.exec(line);
	if (done) return { date: done[1], done: true };
	return null;
}

function taskTitle(text: string): string {
	return text.replace(METADATA_RE, "").replace(/\s+/g, " ").trim();
}

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

function taskLineToEvent(file: TFile, line: string, lineIndex: number): TimelineEvent | null {
	const match = TASK_LINE_RE.exec(line);
	if (!match) return null;

	const extracted = extractTaskDate(line);
	if (!extracted) return null;

	const date = parseTimelineDate(extracted.date);
	if (!date) return null;

	const checked = match[1].toLowerCase() === "x";
	const title = taskTitle(match[2]) || file.basename;

	return {
		id: `${file.path}#L${lineIndex}`,
		title,
		date,
		sourcePath: file.path,
		kind: "event",
		group: checked ? "Done" : "Open",
	};
}

/**
 * Scans vault notes for Obsidian Tasks-style checklist lines
 * (`- [ ] ... 📅 2024-01-01`) and maps each dated task line into its own
 * TimelineEvent. A different code path from the other sources, which are
 * all per-note: here every matching line in a file becomes its own event.
 * Notes are optionally filtered by tag and/or folder.
 */
export async function queryTimelineEventsFromTasks(
	app: App,
	tag: string,
	folder: string
): Promise<TimelineEvent[]> {
	const normalizedTag = tag.trim() ? normalizeTag(tag) : "";

	const events: TimelineEvent[] = [];
	for (const file of app.vault.getMarkdownFiles()) {
		if (normalizedTag && !matchesTag(app, file, normalizedTag)) continue;
		if (!matchesFolder(file, folder)) continue;

		const content = await app.vault.cachedRead(file);
		const lines = content.split("\n");
		for (let i = 0; i < lines.length; i++) {
			const event = taskLineToEvent(file, lines[i], i);
			if (event) events.push(event);
		}
	}
	log.debug("Tasks source resolved", { tag, folder, events: events.length });
	return events;
}
