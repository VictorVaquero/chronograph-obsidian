// Signed-year date model, so events can express years BC/BCE (astronomical
// year numbering: year 0 exists, 1 BC = year 0, 2 BC = year -1, etc — this
// keeps arithmetic simple; display converts back to the 1 BC / 1 AD form).
// JS `Date` cannot represent BC years reliably, so timestamps are avoided
// throughout the renderer/scale code in favor of this struct plus a
// fractional-year float used purely for ordering and axis placement.

export interface TimelineDate {
	year: number;
	month?: number; // 1-12
	day?: number; // 1-31
}

export type TimelineDatePrecision =
	| "day"
	| "month"
	| "year"
	| "decade"
	| "century"
	| "millennium";

const MONTH_NAMES = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const BC_STRING_RE = /^\s*(-?\d+)\s*(bc|bce)\s*$/i;
const AD_STRING_RE = /^\s*(-?\d+)\s*(ad|ce)\s*$/i;
const YEAR_ONLY_RE = /^\s*(-?\d+)\s*$/;

/**
 * Parses a raw Dataview field value into a TimelineDate. Accepts real
 * Dataview/Luxon date values (via `toMillis`/`toObject`-like duck typing,
 * handled by the caller before reaching here), plain ISO date strings, and
 * year-only strings with an optional era suffix ("3000 BC", "44 BCE",
 * "1969", "1969 AD"). Returns undefined if the value can't be parsed.
 */
export function parseTimelineDate(value: unknown): TimelineDate | undefined {
	if (value == null) return undefined;

	if (typeof value === "number") {
		return fromEpochMillis(value);
	}

	if (typeof value === "string") {
		const bc = value.match(BC_STRING_RE);
		if (bc) return { year: -(parseInt(bc[1], 10) - 1) };

		const ad = value.match(AD_STRING_RE);
		if (ad) return { year: parseInt(ad[1], 10) };

		const yearOnly = value.match(YEAR_ONLY_RE);
		if (yearOnly) return { year: parseInt(yearOnly[1], 10) };

		const parsed = Date.parse(value);
		if (!Number.isNaN(parsed)) return fromEpochMillis(parsed);

		return undefined;
	}

	return undefined;
}

function fromEpochMillis(ms: number): TimelineDate {
	const d = new Date(ms);
	return {
		year: d.getFullYear(),
		month: d.getMonth() + 1,
		day: d.getDate(),
	};
}

/** Sortable/scalable numeric value: signed year plus a fraction for month/day. */
export function toOrdinal(date: TimelineDate): number {
	const month = date.month ?? 1;
	const day = date.day ?? 1;
	return date.year + (month - 1) / 12 + (day - 1) / 372;
}

export function compareTimelineDates(a: TimelineDate, b: TimelineDate): number {
	return toOrdinal(a) - toOrdinal(b);
}

/** Inverse of toOrdinal — recovers an approximate calendar date from a fractional-year ordinal. */
export function fromOrdinal(ordinal: number): TimelineDate {
	const year = Math.floor(ordinal);
	const fraction = ordinal - year;
	const monthFraction = fraction * 12;
	const month = Math.min(12, Math.max(1, Math.floor(monthFraction) + 1));
	const dayFraction = (monthFraction - (month - 1)) * 31;
	const day = Math.min(31, Math.max(1, Math.round(dayFraction) + 1));
	return { year, month, day };
}

// Traditional BC/AD year numbering has no year zero (1 BC is immediately
// followed by 1 AD), while the astronomical ordinal/year used for date math
// does (... -1, 0, 1 ..., where 0 = 1 BC). Snapping round boundaries (for
// axis ticks and period dividers alike) in display-year space keeps them
// landing on the numbers a reader actually expects — 2500 BC, 2000 BC, ...,
// 1 BC / 1 AD, 500 AD — instead of off-by-one values like "2501 BC".
export function displayYearOf(ordinalYear: number): number {
	return ordinalYear <= 0 ? ordinalYear - 1 : ordinalYear;
}

export function ordinalYearOfDisplayYear(displayYear: number): number {
	return displayYear < 0 ? displayYear + 1 : displayYear;
}

// AD years are shown bare ("2026") when the view has no BC dates at all —
// the era suffix would be redundant noise. Once any BC date is present,
// "AD" is shown too so mixed-era views stay unambiguous.
function formatYear(year: number, showEra: boolean): string {
	if (year <= 0) return `${1 - year} BC`;
	return showEra ? `${year} AD` : `${year}`;
}

function romanizeCentury(centuryNumber: number): string {
	// centuryNumber is 1-based (1st, 2nd, ...); simple roman numeral for small ranges is enough here.
	const numerals: [number, string][] = [
		[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
		[100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
		[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
	];
	let n = centuryNumber;
	let out = "";
	for (const [value, symbol] of numerals) {
		while (n >= value) {
			out += symbol;
			n -= value;
		}
	}
	return out;
}

/**
 * Formats a TimelineDate for display at the given precision. `showEra`
 * controls whether AD dates carry an explicit "AD" suffix — pass true only
 * when the surrounding view also contains BC dates, so era markers aren't
 * shown when they'd always read the same way.
 */
export function formatTimelineDate(
	date: TimelineDate,
	precision: TimelineDatePrecision,
	showEra = false
): string {
	const isBC = date.year <= 0;
	const era = isBC ? "BC" : showEra ? "AD" : "";

	switch (precision) {
		case "day": {
			if (date.month && date.day) {
				return `${date.day} ${MONTH_NAMES[date.month - 1]} ${formatYear(date.year, showEra)}`;
			}
			return formatYear(date.year, showEra);
		}
		case "month": {
			if (date.month) {
				return `${MONTH_NAMES[date.month - 1]} ${formatYear(date.year, showEra)}`;
			}
			return formatYear(date.year, showEra);
		}
		case "year":
			return formatYear(date.year, showEra);
		case "decade": {
			const absYear = isBC ? 1 - date.year : date.year;
			const decadeStart = Math.floor(absYear / 10) * 10;
			return era ? `${decadeStart} ${era}` : `${decadeStart}`;
		}
		case "century": {
			const absYear = isBC ? 1 - date.year : date.year;
			const centuryNumber = Math.floor(absYear / 100) + 1;
			const label = romanizeCentury(centuryNumber);
			return era ? `${label} ${era}` : label;
		}
		case "millennium": {
			const absYear = isBC ? 1 - date.year : date.year;
			const millenniumNumber = Math.floor(absYear / 1000) + 1;
			const label = `${romanizeCentury(millenniumNumber)} millennium`;
			return era ? `${label} ${era}` : label;
		}
	}
}

export function formatTimelineDateRange(
	start: TimelineDate,
	end: TimelineDate | undefined,
	precision: TimelineDatePrecision,
	showEra = false
): string {
	const startStr = formatTimelineDate(start, precision, showEra);
	if (!end) return startStr;
	const endStr = formatTimelineDate(end, precision, showEra);
	if (startStr === endStr) return startStr;
	return `${startStr} → ${endStr}`;
}

/** True if any event's start/end date in the set is BC (year <= 0). */
export function hasAnyBCDate(dates: TimelineDate[]): boolean {
	return dates.some((d) => d.year <= 0);
}

/**
 * Identifies which bucket a date falls into at the given precision (e.g.
 * which decade, which century), as a stable string key plus a label. Used
 * to detect when consecutive events cross a period boundary so a divider
 * can be drawn between them.
 */
export function bucketOf(
	date: TimelineDate,
	precision: TimelineDatePrecision,
	showEra: boolean
): { key: string; label: string } {
	const isBC = date.year <= 0;
	const absYear = isBC ? 1 - date.year : date.year;

	switch (precision) {
		case "day":
			return { key: `d:${date.year}:${date.month ?? 1}:${date.day ?? 1}`, label: "" };
		case "month":
			return { key: `m:${date.year}:${date.month ?? 1}`, label: "" };
		// "year" and "decade" both bucket by century — matching the horizontal
		// axis, a divider every single year/decade would be denser than useful,
		// so dividers only appear at century boundaries (..., 2500 BC, 2000 BC,
		// ..., 1 BC, 500 AD, ...), snapped the same way the axis ticks are.
		case "year":
		case "decade": {
			const step = 100;
			const bucketStart = Math.floor(displayYearOf(date.year) / step) * step;
			const label = formatYear(ordinalYearOfDisplayYear(bucketStart), showEra);
			return {
				key: `cen:${bucketStart}`,
				label,
			};
		}
		case "century": {
			const centuryNumber = Math.floor(absYear / 100) + 1;
			return {
				key: `cen:${isBC ? "bc" : "ad"}:${centuryNumber}`,
				label: formatTimelineDate(date, "century", showEra),
			};
		}
		case "millennium": {
			const millenniumNumber = Math.floor(absYear / 1000) + 1;
			return {
				key: `mil:${isBC ? "bc" : "ad"}:${millenniumNumber}`,
				label: formatTimelineDate(date, "millennium", showEra),
			};
		}
	}
}
