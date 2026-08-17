import { TimelineEvent } from "../types";
import { TimelineDate } from "../date/timeline-date";

// Hand-authored sample data standing in for a Dataview query result, used
// only by the standalone browser preview (src/dev/preview.ts).
const GROUPS = ["Research", "Writing", "Meetings", "Personal"];

function day(offsetDays: number): TimelineDate {
	const base = new Date("2026-01-01T00:00:00Z").getTime();
	const d = new Date(base + offsetDays * 24 * 60 * 60 * 1000);
	return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export const mockEvents: TimelineEvent[] = [
	{
		id: "1",
		title: "Kickoff meeting",
		date: day(0),
		sourcePath: "Meetings/Kickoff.md",
		description: "Initial scoping call with the team.",
		group: "Meetings",
		pointsTo: "Literature review",
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
		pointsTo: "First draft complete",
	},
	{
		id: "4",
		title: "Vacation",
		date: day(15),
		endDate: day(22),
		sourcePath: "Personal/Vacation.md",
		description: "Out of office.",
		group: "Personal",
		color: "#e67e22",
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
	{
		id: "8",
		title: "Sprint 1",
		date: day(0),
		endDate: day(14),
		sourcePath: "Meetings/Sprint1.md",
		kind: "period",
	},
	{
		id: "9",
		title: "Public launch",
		date: day(20),
		sourcePath: "Meetings/Launch.md",
		description: "Product goes live.",
		kind: "marker",
	},
];

// Ancient-history sample data spanning BC/AD, for testing coarse date
// granularities (decade/century/millennium) and the BC/AD boundary.
//
// TimelineDate.year is the astronomical year (1 BC = year 0, 2 BC = year -1,
// ...), not "the BC year with a minus sign" — converting a BC year to this
// form is `1 - bcYear` (e.g. 44 BC -> -43), matching how parseTimelineDate
// and formatYear in ../date/timeline-date.ts both treat it.
export const ancientMockEvents: TimelineEvent[] = [
	{
		id: "a1",
		title: "Great Pyramid of Giza completed",
		date: { year: -2558 }, // 2559 BC
		sourcePath: "History/Pyramid.md",
		description: "Completion of the Great Pyramid under Khufu.",
		group: "Egypt",
	},
	{
		id: "a2",
		title: "Code of Hammurabi",
		date: { year: -1752 }, // 1753 BC
		sourcePath: "History/Hammurabi.md",
		group: "Mesopotamia",
	},
	{
		id: "a3",
		title: "Trojan War (traditional dating)",
		date: { year: -1192 }, // 1193 BC
		endDate: { year: -1182 }, // 1183 BC
		sourcePath: "History/Troy.md",
		group: "Greece",
	},
	{
		id: "a4",
		title: "Founding of Rome",
		date: { year: -752 }, // 753 BC
		sourcePath: "History/Rome.md",
		group: "Rome",
	},
	{
		id: "a5",
		title: "Roman Republic",
		date: { year: -508 }, // 509 BC
		endDate: { year: -26 }, // 27 BC
		sourcePath: "History/Republic.md",
		description: "From the overthrow of the monarchy to Augustus.",
		group: "Rome",
	},
	{
		id: "a6",
		title: "Julius Caesar assassinated",
		date: { year: -43, month: 3, day: 15 }, // 44 BC
		sourcePath: "History/Caesar.md",
		group: "Rome",
	},
	{
		id: "a7",
		title: "Roman Empire founded",
		date: { year: -26 }, // 27 BC
		endDate: { year: 476 },
		sourcePath: "History/Empire.md",
		group: "Rome",
	},
	{
		id: "a8",
		title: "Fall of the Western Roman Empire",
		date: { year: 476 },
		sourcePath: "History/Fall.md",
		group: "Rome",
	},
	{
		id: "a9",
		title: "Battle of Hastings",
		date: { year: 1066, month: 10, day: 14 },
		sourcePath: "History/Hastings.md",
		group: "Medieval",
	},
	{
		id: "a-period-1",
		title: "Bronze Age",
		date: { year: -3299 }, // 3300 BC
		endDate: { year: -1199 }, // 1200 BC
		sourcePath: "History/BronzeAge.md",
		kind: "period",
	},
	{
		id: "a-period-2",
		title: "Iron Age",
		date: { year: -1199 }, // 1200 BC
		endDate: { year: -549 }, // 550 BC
		sourcePath: "History/IronAge.md",
		kind: "period",
	},
	{
		id: "a-marker-1",
		title: "Eruption of Vesuvius",
		date: { year: 79 },
		sourcePath: "History/Vesuvius.md",
		description: "Destruction of Pompeii and Herculaneum.",
		kind: "marker",
	},
];

export function randomizedMockEvents(count = 25): TimelineEvent[] {
	const events: TimelineEvent[] = [];
	for (let i = 0; i < count; i++) {
		const group = GROUPS[i % GROUPS.length];
		const startOffset = Math.floor(Math.random() * 90);
		const start = day(startOffset);
		const hasRange = Math.random() > 0.6;
		events.push({
			id: `rand-${i}`,
			title: `${group} item ${i + 1}`,
			date: start,
			endDate: hasRange ? day(startOffset + Math.floor(Math.random() * 6 + 1)) : undefined,
			sourcePath: `${group}/Item ${i + 1}.md`,
			description: Math.random() > 0.5 ? "Sample description text." : undefined,
			group,
		});
	}
	return events;
}
