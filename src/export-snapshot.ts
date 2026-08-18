import { App, Notice, normalizePath } from "obsidian";
import { TimelineEvent, TimelineViewConfig } from "./types";
import { exportTimelineSvg } from "./export/svg-export";

function sanitizeFileName(name: string): string {
	return name.replace(/[\\/:*?"<>|]/g, "-").trim();
}

async function uniqueSvgPath(app: App, baseName: string): Promise<string> {
	const safeName = sanitizeFileName(baseName) || "Timeline snapshot";
	let candidate = normalizePath(`${safeName}.svg`);
	let suffix = 2;
	while (app.vault.getAbstractFileByPath(candidate)) {
		candidate = normalizePath(`${safeName} ${suffix}.svg`);
		suffix++;
	}
	return candidate;
}

/**
 * Renders the given events as a static SVG snapshot (a simple chronological
 * list, independent of the interactive layout) and saves it as a new vault
 * file. SVG renders natively wherever it's embedded — a GitHub README, a
 * GitHub issue, or an Obsidian note — with no script and no plugin
 * dependency, unlike the interactive view itself.
 */
export async function exportSnapshot(
	app: App,
	config: TimelineViewConfig,
	events: TimelineEvent[]
): Promise<void> {
	if (events.length === 0) {
		new Notice("No events to export.");
		return;
	}

	// Obsidian's own dark/light choice can diverge from the OS scheme, and is
	// what actually determines how "dark"/"light" this vault looks, so this
	// checks the body class Obsidian sets rather than prefers-color-scheme.
	const theme = document.body.classList.contains("theme-dark") ? "dark" : "light";
	const svg = exportTimelineSvg(events, config.datePrecision, config.sortOrder, config.name, theme);
	const path = await uniqueSvgPath(app, `${config.name || "Timeline"} snapshot`);
	await app.vault.create(path, svg);
	new Notice(`Snapshot saved to "${path}". Embed it anywhere with ![[${path.split("/").pop()}]].`);
}
