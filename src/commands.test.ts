import { describe, expect, it, vi } from "vitest";
import { registerCommands } from "./commands";
import { MarkdownView, TFile } from "./test-utils/obsidian-mock";
import { TimelineViewConfig } from "./types";
import type TimelineGraphPlugin from "./main";

interface EditorCallback {
	(editor: unknown, view: unknown): void;
}

function setup(views: TimelineViewConfig[]): { run: EditorCallback } {
	let editorCallback: EditorCallback | undefined;
	const plugin = {
		settings: { views, defaultViewId: null },
		addCommand: (cmd: { editorCallback?: EditorCallback }) => {
			editorCallback = cmd.editorCallback;
		},
	};
	registerCommands(plugin as unknown as TimelineGraphPlugin);
	return { run: (editor, view) => editorCallback?.(editor, view) };
}

function tableView(overrides: Partial<TimelineViewConfig> = {}): TimelineViewConfig {
	return {
		id: "v1",
		name: "Events",
		sourceType: "table",
		dataviewQuery: "",
		tableNotePath: "Timeline/Events.md",
		fields: { dateField: "date", titleField: "title" },
		sortOrder: "asc",
		layout: "vertical",
		datePrecision: "day",
		verticalCardSide: "alternate",
		verticalLineStyle: "solid",
		...overrides,
	};
}

function fakeView(path: string): MarkdownView {
	const view = new MarkdownView();
	view.file = Object.assign(new TFile(), { path });
	return view;
}

function fakeEditor(content: string) {
	const lines = content.split("\n");
	return {
		getValue: () => content,
		getLine: (n: number) => lines[n],
		getCursor: () => ({ line: lines.length - 1, ch: 0 }),
		replaceRange: vi.fn(),
		setCursor: vi.fn(),
	};
}

describe("insert-table-row command", () => {
	it("does nothing when the active view has no file", () => {
		const { run } = setup([tableView()]);
		const editor = fakeEditor("");
		run(editor, new MarkdownView());
		expect(editor.replaceRange).not.toHaveBeenCalled();
	});

	it("does nothing when no view's table note path matches the active file", () => {
		const { run } = setup([tableView({ tableNotePath: "Other.md" })]);
		const editor = fakeEditor("");
		run(editor, fakeView("Timeline/Events.md"));
		expect(editor.replaceRange).not.toHaveBeenCalled();
	});

	it("scaffolds a header/delimiter/row block when the note has no table yet", () => {
		const { run } = setup([tableView()]);
		const editor = fakeEditor("Some prose.");
		run(editor, fakeView("Timeline/Events.md"));

		expect(editor.replaceRange).toHaveBeenCalledTimes(1);
		const [block] = editor.replaceRange.mock.calls[0] as [string];
		const rows = block.trim().split("\n");
		expect(rows[0]).toBe("| date | title |");
		expect(rows[1]).toBe("| --- | --- |");
		expect(rows[2]).toMatch(/^\| \d{4}-\d{2}-\d{2} \| {2}\|$/);
	});

	it("appends a new row after the last row of an existing table, filling only the date column", () => {
		const { run } = setup([tableView()]);
		const content = ["| date | title |", "| --- | --- |", "| 2024-01-01 | First |"].join("\n");
		const editor = fakeEditor(content);
		run(editor, fakeView("Timeline/Events.md"));

		expect(editor.replaceRange).toHaveBeenCalledTimes(1);
		const [inserted, pos] = editor.replaceRange.mock.calls[0] as [string, { line: number; ch: number }];
		expect(pos).toEqual({ line: 2, ch: content.split("\n")[2].length });
		expect(inserted).toMatch(/^\n\| \d{4}-\d{2}-\d{2} \| {2}\|$/);
		expect(editor.setCursor).toHaveBeenCalledWith({ line: 3, ch: expect.any(Number) as number });
	});
});
