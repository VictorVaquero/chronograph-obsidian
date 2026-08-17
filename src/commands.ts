import { MarkdownView, Notice } from "obsidian";
import type TimelineGraphPlugin from "./main";
import { TimelineFieldMapping, TimelineViewConfig } from "./types";
import { locateMarkdownTable } from "./sources/table-source";

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

// Column order for a freshly-scaffolded table: required fields first, then
// whichever optional fields this view actually maps.
function orderedHeaders(fields: TimelineFieldMapping): string[] {
	return [
		fields.dateField,
		fields.endDateField,
		fields.titleField,
		fields.descriptionField,
		fields.groupField,
		fields.colorField,
		fields.kindField,
		fields.pointsToField,
	].filter((f): f is string => !!f);
}

export function registerCommands(plugin: TimelineGraphPlugin): void {
	plugin.addCommand({
		id: "insert-table-row",
		name: "Insert timeline event row",
		editorCallback: (editor, view) => {
			const file = view instanceof MarkdownView ? view.file : null;
			if (!file) return;

			const config: TimelineViewConfig | undefined = plugin.settings.views.find(
				(v) => v.sourceType === "table" && v.tableNotePath === file.path
			);
			if (!config) {
				new Notice(
					`No timeline view's table note path matches "${file.path}". Set this note as a view's table source in Settings → Chronograph first.`
				);
				return;
			}
			if (!config.fields.dateField) {
				new Notice(`Set a date field for "${config.name}" before inserting rows.`);
				return;
			}

			const content = editor.getValue();
			const location = locateMarkdownTable(content);

			if (!location) {
				const headers = orderedHeaders(config.fields);
				const dateIdx = headers.indexOf(config.fields.dateField);
				const cells = headers.map((h, i) => (i === dateIdx ? todayIso() : ""));
				const block = [
					`| ${headers.join(" | ")} |`,
					`| ${headers.map(() => "---").join(" | ")} |`,
					`| ${cells.join(" | ")} |`,
				].join("\n");
				const cursor = editor.getCursor();
				editor.replaceRange(`${block}\n`, cursor);
				return;
			}

			const dateIdx = location.headers.indexOf(config.fields.dateField.trim().toLowerCase());
			const cells = location.headers.map((_, i) => (i === dateIdx ? todayIso() : ""));
			const rowText = `| ${cells.join(" | ")} |`;

			const insertAt = { line: location.lastLineIndex, ch: editor.getLine(location.lastLineIndex).length };
			editor.replaceRange(`\n${rowText}`, insertAt);
			editor.setCursor({ line: location.lastLineIndex + 1, ch: rowText.length });
		},
	});
}
