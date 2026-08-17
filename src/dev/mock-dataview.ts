import { TimelineEvent } from "../types";
import { mockEvents, ancientMockEvents, randomizedMockEvents } from "./mock-events";

// The dev harness has no real Dataview plugin to query against, so the
// "Dataview" source tab is a small canned lookup from query string -> a
// preset TimelineEvent set, just enough to make the query field feel real
// (type a recognized query, see the timeline change) without pretending to
// implement DQL.

interface MockQuery {
	query: string;
	description: string;
	events: TimelineEvent[];
}

export const MOCK_QUERIES: MockQuery[] = [
	{
		query: 'FROM "Journal"',
		description: "All notes in the Journal folder",
		events: mockEvents,
	},
	{
		query: 'FROM "Journal" WHERE date >= date(2024-01-01)',
		description: "Journal notes from 2024 onward",
		events: randomizedMockEvents(18),
	},
	{
		query: 'FROM #event',
		description: "Notes tagged #event, anywhere in the vault",
		events: randomizedMockEvents(12),
	},
	{
		query: 'FROM "History"',
		description: "Notes in the History folder (BC/AD dates)",
		events: ancientMockEvents,
	},
];

export const DEFAULT_MOCK_QUERY = MOCK_QUERIES[0].query;

/** Looks up a canned result for `query`, matched case-insensitively and
 * ignoring surrounding whitespace, mirroring how forgiving a real DQL parser
 * is about formatting. Returns null for anything unrecognized. */
export function resolveMockQuery(query: string): MockQuery | null {
	const normalized = query.trim().toLowerCase();
	return MOCK_QUERIES.find((q) => q.query.toLowerCase() === normalized) ?? null;
}
