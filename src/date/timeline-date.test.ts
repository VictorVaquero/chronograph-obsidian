import { describe, expect, it } from "vitest";
import {
	bucketOf,
	compareTimelineDates,
	displayYearOf,
	formatTimelineDate,
	formatTimelineDateRange,
	fromOrdinal,
	hasAnyBCDate,
	ordinalYearOfDisplayYear,
	parseTimelineDate,
	toOrdinal,
} from "./timeline-date";

describe("parseTimelineDate", () => {
	it("returns undefined for null/undefined", () => {
		expect(parseTimelineDate(null)).toBeUndefined();
		expect(parseTimelineDate(undefined)).toBeUndefined();
	});

	it("parses epoch milliseconds", () => {
		const ms = Date.UTC(2024, 5, 15); // June 15 2024, UTC
		const date = parseTimelineDate(ms);
		expect(date?.year).toBe(2024);
	});

	it("parses BC/BCE year strings into astronomical year numbering", () => {
		expect(parseTimelineDate("3000 BC")).toEqual({ year: -2999 });
		expect(parseTimelineDate("44 BCE")).toEqual({ year: -43 });
		// "1 BC" computes -(1 - 1), i.e. negative zero — numerically equal to 0
		// but not Object.is-equal to it, so compare via arithmetic instead.
		expect(parseTimelineDate("1 BC")?.year).toBeCloseTo(0);
	});

	it("parses day-precision BC/AD strings via a YYYY-MM-DD + era suffix", () => {
		expect(parseTimelineDate("44-03-15 BC")).toEqual({ year: -43, month: 3, day: 15 });
		expect(parseTimelineDate("0044-3-15 BCE")).toEqual({ year: -43, month: 3, day: 15 });
		expect(parseTimelineDate("1969-07-20 AD")).toEqual({ year: 1969, month: 7, day: 20 });
	});

	it("parses AD/CE year strings", () => {
		expect(parseTimelineDate("1969")).toEqual({ year: 1969 });
		expect(parseTimelineDate("1969 AD")).toEqual({ year: 1969 });
		expect(parseTimelineDate("79 CE")).toEqual({ year: 79 });
	});

	it("parses bare year-only strings, including negative", () => {
		expect(parseTimelineDate("2026")).toEqual({ year: 2026 });
		expect(parseTimelineDate("-500")).toEqual({ year: -500 });
	});

	it("parses ISO date strings", () => {
		const date = parseTimelineDate("2024-06-15");
		expect(date?.year).toBe(2024);
		expect(date?.month).toBe(6);
		expect(date?.day).toBe(15);
	});

	it("returns undefined for unparseable strings", () => {
		expect(parseTimelineDate("not a date")).toBeUndefined();
	});

	it("returns undefined for unsupported value types", () => {
		expect(parseTimelineDate({})).toBeUndefined();
		expect(parseTimelineDate(true)).toBeUndefined();
	});
});

describe("toOrdinal / compareTimelineDates", () => {
	it("orders dates within the same year by month and day", () => {
		const jan = { year: 2024, month: 1, day: 1 };
		const june = { year: 2024, month: 6, day: 15 };
		const dec = { year: 2024, month: 12, day: 31 };
		expect(toOrdinal(jan)).toBeLessThan(toOrdinal(june));
		expect(toOrdinal(june)).toBeLessThan(toOrdinal(dec));
	});

	it("orders years monotonically regardless of month/day", () => {
		const earlyYearLateDate = { year: 2023, month: 12, day: 31 };
		const lateYearEarlyDate = { year: 2024, month: 1, day: 1 };
		expect(toOrdinal(earlyYearLateDate)).toBeLessThan(toOrdinal(lateYearEarlyDate));
	});

	it("defaults missing month/day to the start of the period", () => {
		expect(toOrdinal({ year: 2024 })).toBe(toOrdinal({ year: 2024, month: 1, day: 1 }));
	});

	it("compareTimelineDates returns negative/zero/positive consistently with toOrdinal", () => {
		const a = { year: 2000 };
		const b = { year: 2001 };
		expect(compareTimelineDates(a, b)).toBeLessThan(0);
		expect(compareTimelineDates(b, a)).toBeGreaterThan(0);
		expect(compareTimelineDates(a, a)).toBe(0);
	});
});

describe("fromOrdinal", () => {
	it("round-trips whole years", () => {
		const ordinal = toOrdinal({ year: 1969, month: 1, day: 1 });
		expect(fromOrdinal(ordinal).year).toBe(1969);
	});

	it("clamps month/day into valid ranges", () => {
		const result = fromOrdinal(2024);
		expect(result.month).toBeGreaterThanOrEqual(1);
		expect(result.month).toBeLessThanOrEqual(12);
		expect(result.day).toBeGreaterThanOrEqual(1);
		expect(result.day).toBeLessThanOrEqual(31);
	});
});

describe("displayYearOf / ordinalYearOfDisplayYear", () => {
	it("maps ordinal year 0 (1 BC) to display year -1", () => {
		expect(displayYearOf(0)).toBe(-1);
	});

	it("maps ordinal year 1 (1 AD) to display year 1 (no year zero)", () => {
		expect(displayYearOf(1)).toBe(1);
	});

	it("is the inverse of ordinalYearOfDisplayYear across the BC/AD boundary", () => {
		for (const displayYear of [-2500, -1, 1, 500, 2024]) {
			expect(displayYearOf(ordinalYearOfDisplayYear(displayYear))).toBe(displayYear);
		}
	});
});

describe("formatTimelineDate", () => {
	it("formats AD years without an era suffix by default", () => {
		expect(formatTimelineDate({ year: 2024 }, "year")).toBe("2024");
	});

	it("formats AD years with an era suffix when showEra is true", () => {
		expect(formatTimelineDate({ year: 2024 }, "year", true)).toBe("2024 AD");
	});

	it("always shows BC suffix regardless of showEra", () => {
		expect(formatTimelineDate({ year: -43 }, "year", false)).toBe("44 BC");
		expect(formatTimelineDate({ year: -43 }, "year", true)).toBe("44 BC");
	});

	it("formats day precision with month/day when present", () => {
		expect(formatTimelineDate({ year: 2024, month: 6, day: 15 }, "day")).toBe("15 Jun 2024");
	});

	it("falls back to year-only formatting when month/day are absent", () => {
		expect(formatTimelineDate({ year: 2024 }, "day")).toBe("2024");
	});

	it("shows the exact year at decade precision, not floored to the decade start", () => {
		expect(formatTimelineDate({ year: 1983 }, "decade")).toBe("1983");
	});

	it("shows the exact year at century precision, not a roman-numeral century label", () => {
		expect(formatTimelineDate({ year: 1983 }, "century")).toBe("1983");
	});

	it("shows the exact year at millennium precision", () => {
		expect(formatTimelineDate({ year: 1983 }, "millennium")).toBe("1983");
	});
});

describe("formatTimelineDateRange", () => {
	it("returns a single label when there is no end date", () => {
		expect(formatTimelineDateRange({ year: 2024 }, undefined, "year")).toBe("2024");
	});

	it("joins distinct start/end labels with an arrow", () => {
		expect(formatTimelineDateRange({ year: 2020 }, { year: 2024 }, "year")).toBe("2020 → 2024");
	});

	it("collapses to a single label when start and end format identically", () => {
		const start = { year: 2024, month: 6, day: 1 };
		const end = { year: 2024, month: 6, day: 30 };
		expect(formatTimelineDateRange(start, end, "year")).toBe("2024");
	});
});

describe("hasAnyBCDate", () => {
	it("is false when all dates are AD", () => {
		expect(hasAnyBCDate([{ year: 1 }, { year: 2024 }])).toBe(false);
	});

	it("is true when at least one date is BC (year <= 0)", () => {
		expect(hasAnyBCDate([{ year: 2024 }, { year: -100 }])).toBe(true);
	});

	it("is false for an empty list", () => {
		expect(hasAnyBCDate([])).toBe(false);
	});
});

describe("bucketOf", () => {
	it("gives day precision a distinct key per exact date", () => {
		const a = bucketOf({ year: 2024, month: 1, day: 1 }, "day", false);
		const b = bucketOf({ year: 2024, month: 1, day: 2 }, "day", false);
		expect(a.key).not.toBe(b.key);
	});

	it("buckets year/decade precision by century", () => {
		const a = bucketOf({ year: 1950 }, "year", false);
		const b = bucketOf({ year: 1990 }, "year", false);
		expect(a.key).toBe(b.key);
	});

	it("buckets century precision by century number, distinguishing BC/AD", () => {
		const bc = bucketOf({ year: -50 }, "century", false);
		const ad = bucketOf({ year: 50 }, "century", false);
		expect(bc.key).not.toBe(ad.key);
	});

	it("produces a human-readable label for century/millennium precision", () => {
		expect(bucketOf({ year: 2024 }, "century", false).label).toBe("XXI");
		expect(bucketOf({ year: 2024 }, "millennium", false).label).toBe("III millennium");
	});
});
