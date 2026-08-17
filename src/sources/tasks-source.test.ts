import { describe, expect, it } from "vitest";
import { queryTimelineEventsFromTasks } from "./tasks-source";
import { TFile } from "obsidian";

interface MockNote {
	path: string;
	basename: string;
	content: string;
	tags?: string[];
}

function makeApp(notes: MockNote[]): unknown {
	const files = notes.map((n) => {
		const file = new TFile();
		file.path = n.path;
		(file as unknown as { basename: string }).basename = n.basename;
		return file;
	});

	return {
		vault: {
			getMarkdownFiles: () => files,
			cachedRead: (file: TFile) => Promise.resolve(notes.find((n) => n.path === file.path)?.content ?? ""),
		},
		metadataCache: {
			getFileCache: (file: TFile) => {
				const note = notes.find((n) => n.path === file.path);
				if (!note) return null;
				return { tags: (note.tags ?? []).map((tag) => ({ tag })) };
			},
		},
	};
}

describe("queryTimelineEventsFromTasks", () => {
	it("maps a due-date task line into an event", async () => {
		const app = makeApp([{ path: "Notes/A.md", basename: "A", content: "- [ ] Ship release 📅 2024-06-15" }]);
		const events = await queryTimelineEventsFromTasks(app as never, "", "");
		expect(events).toHaveLength(1);
		expect(events[0].title).toBe("Ship release");
		expect(events[0].date).toEqual({ year: 2024, month: 6, day: 15 });
		expect(events[0].sourcePath).toBe("Notes/A.md");
	});

	it("recognizes scheduled, start, and done emoji-dates", async () => {
		const app = makeApp([
			{
				path: "A.md",
				basename: "A",
				content: [
					"- [ ] Scheduled task ⏳ 2024-01-01",
					"- [ ] Start task 🛫 2024-02-01",
					"- [x] Done task ✅ 2024-03-01",
				].join("\n"),
			},
		]);
		const events = await queryTimelineEventsFromTasks(app as never, "", "");
		expect(events).toHaveLength(3);
		expect(events.map((e) => e.date)).toEqual([
			{ year: 2024, month: 1, day: 1 },
			{ year: 2024, month: 2, day: 1 },
			{ year: 2024, month: 3, day: 1 },
		]);
	});

	it("marks checked tasks with group 'Done' and unchecked with 'Open'", async () => {
		const app = makeApp([
			{
				path: "A.md",
				basename: "A",
				content: "- [ ] Open task 📅 2024-01-01\n- [x] Closed task 📅 2024-01-02",
			},
		]);
		const events = await queryTimelineEventsFromTasks(app as never, "", "");
		expect(events.map((e) => e.group)).toEqual(["Open", "Done"]);
	});

	it("ignores task lines with no recognized emoji-date", async () => {
		const app = makeApp([{ path: "A.md", basename: "A", content: "- [ ] Task with no date" }]);
		const events = await queryTimelineEventsFromTasks(app as never, "", "");
		expect(events).toHaveLength(0);
	});

	it("ignores non-task lines", async () => {
		const app = makeApp([{ path: "A.md", basename: "A", content: "Just a sentence 📅 2024-01-01" }]);
		const events = await queryTimelineEventsFromTasks(app as never, "", "");
		expect(events).toHaveLength(0);
	});

	it("strips a leading priority marker and the due-date marker from the title", async () => {
		const app = makeApp([{ path: "A.md", basename: "A", content: "- [ ] Important task 🔺 📅 2024-06-15" }]);
		const events = await queryTimelineEventsFromTasks(app as never, "", "");
		expect(events[0].title).toBe("Important task");
	});

	it("assigns a stable per-line id so multiple tasks in one note don't collide", async () => {
		const app = makeApp([
			{ path: "A.md", basename: "A", content: "- [ ] First 📅 2024-01-01\n- [ ] Second 📅 2024-01-02" },
		]);
		const events = await queryTimelineEventsFromTasks(app as never, "", "");
		expect(new Set(events.map((e) => e.id)).size).toBe(2);
	});

	it("filters by tag when a tag is configured", async () => {
		const app = makeApp([
			{ path: "A.md", basename: "A", content: "- [ ] Task A 📅 2024-01-01", tags: ["#todo"] },
			{ path: "B.md", basename: "B", content: "- [ ] Task B 📅 2024-02-01", tags: ["#other"] },
		]);
		const events = await queryTimelineEventsFromTasks(app as never, "todo", "");
		expect(events).toHaveLength(1);
		expect(events[0].sourcePath).toBe("A.md");
	});

	it("filters by folder when a folder is configured", async () => {
		const app = makeApp([
			{ path: "Journal/A.md", basename: "A", content: "- [ ] Task A 📅 2024-01-01" },
			{ path: "Other/B.md", basename: "B", content: "- [ ] Task B 📅 2024-02-01" },
		]);
		const events = await queryTimelineEventsFromTasks(app as never, "", "Journal");
		expect(events).toHaveLength(1);
		expect(events[0].sourcePath).toBe("Journal/A.md");
	});
});
