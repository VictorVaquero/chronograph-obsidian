import { App, TFile } from "obsidian";
import { TimelineViewConfig } from "./types";
import { insertTableRow, queryTimelineEventsFromTable } from "./sources/table-source";
import { log } from "./log";

export class TimelineCreateEventError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TimelineCreateEventError";
	}
}

// Vault paths use forward slashes and no leading slash, regardless of OS.
function joinVaultPath(folder: string, fileName: string): string {
	const trimmedFolder = folder.trim().replace(/^\/+|\/+$/g, "");
	return trimmedFolder ? `${trimmedFolder}/${fileName}` : fileName;
}

function sanitizeFileName(name: string): string {
	return name.replace(/[\\/:*?"<>|]/g, "-").trim();
}

async function uniqueNotePath(app: App, folder: string, baseName: string): Promise<string> {
	const safeName = sanitizeFileName(baseName) || "Event";
	let candidate = joinVaultPath(folder, `${safeName}.md`);
	let suffix = 2;
	while (app.vault.getAbstractFileByPath(candidate)) {
		candidate = joinVaultPath(folder, `${safeName} ${suffix}.md`);
		suffix++;
	}
	return candidate;
}

/**
 * Creates a new timeline event for `config`'s source: appends/scaffolds a
 * table row for the "table" source, or creates a new note with frontmatter
 * for "dataview"/"frontmatter" sources. `title` may be empty, in which case
 * `date` is used as both the event title and the new note's file name.
 */
export async function createTimelineEvent(
	app: App,
	config: TimelineViewConfig,
	date: string,
	title: string
): Promise<void> {
	if (config.sourceType === "tasks") {
		log.warn("Cannot create event: tasks source", { view: config.name });
		throw new TimelineCreateEventError(
			`"${config.name}" uses the Obsidian Tasks source; create events as checklist lines directly in a note instead.`
		);
	}

	if (!config.fields.dateField) {
		log.warn("Cannot create event: no date field configured", { view: config.name });
		throw new TimelineCreateEventError(`Set a date field for "${config.name}" before creating events.`);
	}

	if (config.sourceType === "table") {
		if (!config.tableNotePath) {
			log.warn("Cannot create event: no table note path configured", { view: config.name });
			throw new TimelineCreateEventError(`Set a table note path for "${config.name}" before creating events.`);
		}
		const file = app.vault.getAbstractFileByPath(config.tableNotePath);
		if (!(file instanceof TFile)) {
			log.warn("Cannot create event: table note not found", { view: config.name, path: config.tableNotePath });
			throw new TimelineCreateEventError(`Table note not found: "${config.tableNotePath}".`);
		}

		const cellValues: Record<string, string> = { [config.fields.dateField.trim().toLowerCase()]: date };
		if (title && config.fields.titleField) {
			cellValues[config.fields.titleField.trim().toLowerCase()] = title;
		}

		await app.vault.process(file, (content) => insertTableRow(content, config.fields, cellValues));
		// Validate the note still parses as a table after the edit, surfacing a
		// clear error instead of silently producing an unreadable timeline.
		await queryTimelineEventsFromTable(app, config.tableNotePath, config.fields);
		log.info("Created event row", { view: config.name, path: config.tableNotePath });
		return;
	}

	const folder = config.sourceType === "frontmatter" ? config.frontmatterFolder : "";
	const path = await uniqueNotePath(app, folder, title || date);

	const file = await app.vault.create(path, "");
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		frontmatter[config.fields.dateField] = date;
		if (title && config.fields.titleField) {
			frontmatter[config.fields.titleField] = title;
		}
	});
	log.info("Created event note", { view: config.name, path });
}
