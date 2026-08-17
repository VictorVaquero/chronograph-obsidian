import { TimelineEvent } from "../types";

// Hand-authored sample data standing in for a Dataview query result, used
// only by the standalone browser preview (src/dev/preview.ts).
const GROUPS = ["Research", "Writing", "Meetings", "Personal"];

function day(offsetDays: number): number {
	const base = new Date("2026-01-01T00:00:00Z").getTime();
	return base + offsetDays * 24 * 60 * 60 * 1000;
}

export const mockEvents: TimelineEvent[] = [
	{
		id: "1",
		title: "Kickoff meeting",
		date: day(0),
		sourcePath: "Meetings/Kickoff.md",
		description: "Initial scoping call with the team.",
		group: "Meetings",
	},
	{
		id: "2",
		title: "Literature review",
		date: day(3),
		endDate: day(10),
		sourcePath: "Research/Lit Review.md",
		description: "Survey prior art on timeline visualizations.",
		group: "Research",
	},
	{
		id: "3",
		title: "Draft outline",
		date: day(12),
		sourcePath: "Writing/Outline.md",
		group: "Writing",
	},
	{
		id: "4",
		title: "Vacation",
		date: day(15),
		endDate: day(22),
		sourcePath: "Personal/Vacation.md",
		description: "Out of office.",
		group: "Personal",
	},
	{
		id: "5",
		title: "First draft complete",
		date: day(30),
		sourcePath: "Writing/Draft v1.md",
		description: "Full first pass, ready for review.",
		group: "Writing",
	},
	{
		id: "6",
		title: "Review meeting",
		date: day(33),
		sourcePath: "Meetings/Review.md",
		group: "Meetings",
	},
	{
		id: "7",
		title: "Follow-up research",
		date: day(35),
		endDate: day(40),
		sourcePath: "Research/Follow-up.md",
		group: "Research",
	},
];

export function randomizedMockEvents(count = 25): TimelineEvent[] {
	const events: TimelineEvent[] = [];
	for (let i = 0; i < count; i++) {
		const group = GROUPS[i % GROUPS.length];
		const start = day(Math.floor(Math.random() * 90));
		const hasRange = Math.random() > 0.6;
		events.push({
			id: `rand-${i}`,
			title: `${group} item ${i + 1}`,
			date: start,
			endDate: hasRange ? start + Math.floor(Math.random() * 6 + 1) * 86400000 : undefined,
			sourcePath: `${group}/Item ${i + 1}.md`,
			description: Math.random() > 0.5 ? "Sample description text." : undefined,
			group,
		});
	}
	return events;
}
