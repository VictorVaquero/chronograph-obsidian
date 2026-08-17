import { TimelineDatePrecision } from "../../types";
import { displayYearOf, formatTimelineDate, fromOrdinal, ordinalYearOfDisplayYear } from "../../date/timeline-date";
import { Scale, xFor } from "./scale";

// Minimum tick spacing (in years) for each display precision. Ticks are
// always coarser than the precision's own bucket size — "year" and "decade"
// both floor at century-sized steps (0, 100, 200 ...) since a tick every
// single year/decade would be too dense to read as axis labels; the finer
// precision still governs event-card date formatting, just not tick spacing.
const MIN_STEP_YEARS: Record<TimelineDatePrecision, number> = {
	day: 1 / 365,
	month: 1 / 12,
	year: 100,
	decade: 100,
	century: 100,
	millennium: 1000,
};

export interface Tick {
	ordinal: number;
	label: string;
}

// Picks a "nice" step size (1/2/5 × a power of ten, in years) so ticks land
// on round boundaries — 0, 100, 200 for centuries; 0, 10, 20 for decades;
// whole years when zoomed into months; etc — rather than arbitrary
// power-of-two offsets from the data's start date.
function niceStepYears(spanYears: number, minStepYears: number, targetTicks: number): number {
	const roughStep = Math.max(minStepYears, spanYears / targetTicks);
	const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
	const normalized = roughStep / magnitude;
	const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
	return Math.max(minStepYears, niceNormalized * magnitude);
}

// Axis ticks always show a plain year number (or day/month when zoomed
// in that far) rather than a roman-numeral century/millennium label —
// "100 AD" reads as a boundary, "II century AD" doesn't. The century/
// millennium wording is reserved for period dividers and event dates.
function tickPrecision(precision: TimelineDatePrecision, stepYears: number): TimelineDatePrecision {
	if (stepYears >= 1) return "year";
	return precision === "day" ? "day" : "month";
}

export function computeTicks(
	scale: Scale,
	precision: TimelineDatePrecision,
	showEra: boolean
): Tick[] {
	const spanYears = Math.max(1 / 365, scale.maxOrdinal - scale.minOrdinal);
	const step = niceStepYears(spanYears, MIN_STEP_YEARS[precision], 8);

	const labelPrecision = tickPrecision(precision, step);
	const ticks: Tick[] = [];
	const startDisplayYear = Math.floor(displayYearOf(Math.floor(scale.minOrdinal)) / step) * step;
	for (let displayYear = startDisplayYear; ; displayYear += step) {
		const ordinal = ordinalYearOfDisplayYear(displayYear);
		if (ordinal > scale.maxOrdinal) break;
		if (ordinal < scale.minOrdinal) continue;
		ticks.push({
			ordinal,
			label: formatTimelineDate(fromOrdinal(ordinal), labelPrecision, showEra),
		});
	}

	// A visible span entirely inside one coarse bucket (e.g. a few weeks at
	// "year" precision, floored to century-sized steps) would otherwise get
	// no tick at all — always show at least one, anchored to the range start.
	if (ticks.length === 0) {
		ticks.push({
			ordinal: scale.minOrdinal,
			label: formatTimelineDate(fromOrdinal(scale.minOrdinal), labelPrecision, showEra),
		});
	}

	return ticks;
}

export function renderAxis(ticks: Tick[], scale: Scale): HTMLElement {
	const axis = createDiv();
	axis.className = "timeline-graph-axis";

	for (const tick of ticks) {
		const tickEl = createDiv();
		tickEl.className = "timeline-graph-axis-tick";
		tickEl.style.left = `${xFor(tick.ordinal, scale)}%`;

		const label = createSpan();
		label.textContent = tick.label;
		tickEl.appendChild(label);
		axis.appendChild(tickEl);
	}

	return axis;
}

// Full-height vertical lines through the lanes, marking where each axis
// tick's period boundary falls, so year/decade/century transitions are
// visible at a glance behind the event markers.
export function renderPeriodLines(ticks: Tick[], scale: Scale): HTMLElement {
	const wrap = createDiv();
	wrap.className = "timeline-graph-period-lines";

	for (const tick of ticks) {
		const line = createDiv();
		line.className = "timeline-graph-period-line";
		line.style.left = `${xFor(tick.ordinal, scale)}%`;
		wrap.appendChild(line);
	}

	return wrap;
}
