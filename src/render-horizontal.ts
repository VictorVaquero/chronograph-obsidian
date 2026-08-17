import { TimelineEvent, TimelineDatePrecision } from "./types";
import {
	TimelineRenderCallbacks,
	colorForGroup,
	groupsOf,
	renderEmptyState,
} from "./render-shared";
import {
	TimelineDate,
	displayYearOf,
	formatTimelineDate,
	fromOrdinal,
	hasAnyBCDate,
	ordinalYearOfDisplayYear,
	toOrdinal,
} from "./timeline-date";

const AXIS_PADDING_PX = 48;
const MIN_TRACK_WIDTH_PX = 600;
const MAX_TRACK_WIDTH_PX = 20000;
// Minimum pixel width reserved for the gap between two consecutive distinct
// event dates, so labels/points don't crowd each other regardless of how
// many calendar years separate them.
const MIN_GAP_PER_EVENT_PX = 90;
// A gap between two events never claims more than this many pixels no
// matter how many empty calendar years it spans — a 50-year empty stretch
// and a 5000-year empty stretch both just read as "a big gap," so neither
// needs to balloon the track width proportionally to its raw duration.
const MAX_GAP_PX = 260;
// Below this many years, a gap scales proportionally between the min and
// max above; beyond it, further duration no longer grows the gap's pixels.
const GAP_SATURATION_YEARS = 50;

// Non-linear scale: pixel position is piecewise-linear across breakpoints
// placed at every distinct event ordinal (plus the overall min/max), where
// each segment gets at least MIN_GAP_PER_EVENT_PX regardless of its
// calendar duration, and grows toward MAX_GAP_PX as the gap widens, capping
// out for anything beyond GAP_SATURATION_YEARS. This is what lets sparse,
// widely-separated events stay compact while dense clusters still get room.
interface Scale {
	minOrdinal: number;
	maxOrdinal: number;
	trackWidth: number;
	breakpoints: number[]; // sorted ordinals
	positions: number[]; // pixel offset (0..trackWidth) for each breakpoint
}

function buildScale(events: TimelineEvent[]): Scale {
	const ordinals = events.flatMap((e) => (e.endDate ? [toOrdinal(e.date), toOrdinal(e.endDate)] : [toOrdinal(e.date)]));
	const minOrdinal = Math.min(...ordinals);
	const maxOrdinal = Math.max(...ordinals);

	const breakpoints = Array.from(new Set([minOrdinal, maxOrdinal, ...ordinals])).sort((a, b) => a - b);

	const positions: number[] = [0];
	for (let i = 1; i < breakpoints.length; i++) {
		const gapYears = breakpoints[i] - breakpoints[i - 1];
		const saturation = Math.min(1, gapYears / GAP_SATURATION_YEARS);
		const gapPx = MIN_GAP_PER_EVENT_PX + saturation * (MAX_GAP_PX - MIN_GAP_PER_EVENT_PX);
		positions.push(positions[i - 1] + gapPx);
	}

	const rawWidth = positions[positions.length - 1] ?? 0;
	const trackWidth = Math.min(MAX_TRACK_WIDTH_PX, Math.max(MIN_TRACK_WIDTH_PX, rawWidth));

	// Rescale proportionally so the track hits trackWidth exactly (handles
	// both the MIN_TRACK_WIDTH_PX floor and the MAX_TRACK_WIDTH_PX cap).
	const scaleFactor = rawWidth > 0 ? trackWidth / rawWidth : 1;
	const scaledPositions = positions.map((p) => p * scaleFactor);

	return { minOrdinal, maxOrdinal, trackWidth, breakpoints, positions: scaledPositions };
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 12;
const ZOOM_STEP = 1.15;

export function renderHorizontalTimeline(
	container: HTMLElement,
	events: TimelineEvent[],
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision = "day"
): void {
	const laneEvents = events.filter((e) => (e.kind ?? "event") === "event");
	const periodEvents = events.filter((e) => e.kind === "period");
	const markerEvents = events.filter((e) => e.kind === "marker");

	if (events.length === 0) {
		renderEmptyState(
			container,
			"No events matched this view's query and date field."
		);
		return;
	}

	const scale = buildScale(events);
	const totalWidth = scale.trackWidth + AXIS_PADDING_PX * 2;

	const showEra = hasAnyBCDate(events.flatMap((e) => (e.endDate ? [e.date, e.endDate] : [e.date])));

	const root = document.createElement("div");
	root.className = "timeline-graph-horizontal";

	const toolbar = document.createElement("div");
	toolbar.className = "timeline-graph-horizontal-toolbar";

	const zoomOutBtn = document.createElement("button");
	zoomOutBtn.type = "button";
	zoomOutBtn.className = "timeline-graph-zoom-btn";
	zoomOutBtn.textContent = "−";
	zoomOutBtn.title = "Zoom out";

	const zoomInBtn = document.createElement("button");
	zoomInBtn.type = "button";
	zoomInBtn.className = "timeline-graph-zoom-btn";
	zoomInBtn.textContent = "+";
	zoomInBtn.title = "Zoom in";

	const fitBtn = document.createElement("button");
	fitBtn.type = "button";
	fitBtn.className = "timeline-graph-fit-btn";
	fitBtn.textContent = "Fit";
	fitBtn.title = "Reset zoom and scroll position";

	toolbar.append(zoomOutBtn, zoomInBtn, fitBtn);

	const scroller = document.createElement("div");
	scroller.className = "timeline-graph-horizontal-scroller";

	const track = document.createElement("div");
	track.className = "timeline-graph-horizontal-track";
	track.style.width = `${totalWidth}px`;

	const ticks = computeTicks(scale, precision, showEra);
	track.appendChild(renderPeriodBands(periodEvents, scale, callbacks, precision, showEra));
	track.appendChild(renderAxis(ticks, scale));
	track.appendChild(renderPeriodLines(ticks, scale));

	groupsOf(laneEvents).forEach((group, laneIndex) => {
		const eventsInLane = laneEvents.filter((e) => (e.group ?? "") === group);
		track.appendChild(
			renderLane(group, eventsInLane, scale, laneIndex, callbacks, precision, showEra)
		);
	});

	for (const marker of markerEvents) {
		track.appendChild(renderFlagMarker(marker, scale, callbacks, precision, showEra));
	}

	const now = toOrdinal(todayAsTimelineDate());
	if (now >= scale.minOrdinal && now <= scale.maxOrdinal) {
		track.appendChild(renderTodayLine(now, scale));
	}

	scroller.appendChild(track);
	root.appendChild(toolbar);
	root.appendChild(scroller);
	container.appendChild(root);

	setupZoomAndPan(scroller, track, totalWidth, zoomInBtn, zoomOutBtn, fitBtn);
}

// Zoom resizes the track element's width; since every child is positioned
// with `left`/`width` in percent (see xFor), resizing the track rescales
// every child's effective pixel position for free — no per-element layout
// recompute needed on every wheel tick. Pan is just native scroll. Zooming
// keeps the pointer's calendar position fixed under the cursor by adjusting
// scrollLeft after the resize; dragging pans via scrollLeft deltas.
function setupZoomAndPan(
	scroller: HTMLElement,
	track: HTMLElement,
	baseWidth: number,
	zoomInBtn: HTMLButtonElement,
	zoomOutBtn: HTMLButtonElement,
	fitBtn: HTMLButtonElement
): void {
	let zoom = 1;

	function applyZoom(newZoom: number, pivotClientX?: number): void {
		const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
		const rect = scroller.getBoundingClientRect();
		const pivotX = pivotClientX ?? rect.left + rect.width / 2;
		const scrollerOffsetX = pivotX - rect.left;
		const contentX = scroller.scrollLeft + scrollerOffsetX;
		const ratio = contentX / (baseWidth * zoom);

		zoom = clamped;
		track.style.width = `${baseWidth * zoom}px`;

		const newContentX = ratio * baseWidth * zoom;
		scroller.scrollLeft = newContentX - scrollerOffsetX;
	}

	scroller.addEventListener(
		"wheel",
		(evt) => {
			if (!evt.ctrlKey && !evt.metaKey && Math.abs(evt.deltaY) <= Math.abs(evt.deltaX)) {
				// Predominantly horizontal wheel gesture (trackpad pan) — let native scroll handle it.
				return;
			}
			evt.preventDefault();
			const direction = evt.deltaY < 0 ? 1 : -1;
			applyZoom(zoom * Math.pow(ZOOM_STEP, direction), evt.clientX);
		},
		{ passive: false }
	);

	let isDragging = false;
	let dragStartX = 0;
	let dragStartScrollLeft = 0;

	scroller.addEventListener("pointerdown", (evt) => {
		if (evt.target instanceof HTMLElement && evt.target.closest("button, a")) return;
		isDragging = true;
		dragStartX = evt.clientX;
		dragStartScrollLeft = scroller.scrollLeft;
		scroller.classList.add("is-panning");
		scroller.setPointerCapture(evt.pointerId);
	});
	scroller.addEventListener("pointermove", (evt) => {
		if (!isDragging) return;
		scroller.scrollLeft = dragStartScrollLeft - (evt.clientX - dragStartX);
	});
	function endDrag(evt: PointerEvent): void {
		if (!isDragging) return;
		isDragging = false;
		scroller.classList.remove("is-panning");
		scroller.releasePointerCapture(evt.pointerId);
	}
	scroller.addEventListener("pointerup", endDrag);
	scroller.addEventListener("pointercancel", endDrag);

	zoomInBtn.addEventListener("click", () => applyZoom(zoom * ZOOM_STEP));
	zoomOutBtn.addEventListener("click", () => applyZoom(zoom / ZOOM_STEP));
	fitBtn.addEventListener("click", () => {
		zoom = 1;
		track.style.width = `${baseWidth}px`;
		scroller.scrollLeft = 0;
	});
}

function todayAsTimelineDate(): TimelineDate {
	const d = new Date();
	return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

// Maps a calendar ordinal to a pixel offset (against the scale's *base*,
// unzoomed width) via piecewise-linear interpolation over the scale's
// breakpoints — values between two breakpoints (e.g. an axis tick falling
// inside a large empty gap) are interpolated linearly within that segment's
// (compressed) pixel span; values outside [minOrdinal, maxOrdinal]
// extrapolate off the nearest edge.
function xForPx(ordinal: number, scale: Scale): number {
	const { breakpoints, positions } = scale;

	if (breakpoints.length === 1) {
		return AXIS_PADDING_PX + positions[0];
	}

	if (ordinal <= breakpoints[0]) {
		const span = Math.max(1 / 365, breakpoints[1] - breakpoints[0]);
		const px = Math.max(1, positions[1] - positions[0]);
		return AXIS_PADDING_PX + positions[0] + ((ordinal - breakpoints[0]) / span) * px;
	}
	const last = breakpoints.length - 1;
	if (ordinal >= breakpoints[last]) {
		const span = Math.max(1 / 365, breakpoints[last] - breakpoints[last - 1]);
		const px = Math.max(1, positions[last] - positions[last - 1]);
		return AXIS_PADDING_PX + positions[last] + ((ordinal - breakpoints[last]) / span) * px;
	}

	let hi = 1;
	while (breakpoints[hi] < ordinal) hi++;
	const lo = hi - 1;
	const span = Math.max(1 / 365, breakpoints[hi] - breakpoints[lo]);
	const t = (ordinal - breakpoints[lo]) / span;
	return AXIS_PADDING_PX + positions[lo] + t * (positions[hi] - positions[lo]);
}

// Percentage (0-100) of the track's total width — used for all element
// positioning/sizing so that zooming (which just resizes the track element)
// scales every child's absolute pixel position along with it for free,
// without re-running layout math on every zoom tick.
function xFor(ordinal: number, scale: Scale): number {
	const totalWidth = scale.trackWidth + AXIS_PADDING_PX * 2;
	return (xForPx(ordinal, scale) / totalWidth) * 100;
}

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

interface Tick {
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

function computeTicks(
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

function renderAxis(ticks: Tick[], scale: Scale): HTMLElement {
	const axis = document.createElement("div");
	axis.className = "timeline-graph-axis";

	for (const tick of ticks) {
		const tickEl = document.createElement("div");
		tickEl.className = "timeline-graph-axis-tick";
		tickEl.style.left = `${xFor(tick.ordinal, scale)}%`;

		const label = document.createElement("span");
		label.textContent = tick.label;
		tickEl.appendChild(label);
		axis.appendChild(tickEl);
	}

	return axis;
}

// Full-height vertical lines through the lanes, marking where each axis
// tick's period boundary falls, so year/decade/century transitions are
// visible at a glance behind the event markers.
function renderPeriodLines(ticks: Tick[], scale: Scale): HTMLElement {
	const wrap = document.createElement("div");
	wrap.className = "timeline-graph-period-lines";

	for (const tick of ticks) {
		const line = document.createElement("div");
		line.className = "timeline-graph-period-line";
		line.style.left = `${xFor(tick.ordinal, scale)}%`;
		wrap.appendChild(line);
	}

	return wrap;
}

// Axis ticks always show a plain year number (or day/month when zoomed
// in that far) rather than a roman-numeral century/millennium label —
// "100 AD" reads as a boundary, "II century AD" doesn't. The century/
// millennium wording is reserved for period dividers and event dates.
function tickPrecision(precision: TimelineDatePrecision, stepYears: number): TimelineDatePrecision {
	if (stepYears >= 1) return "year";
	return precision === "day" ? "day" : "month";
}

function renderLane(
	group: string,
	laneEvents: TimelineEvent[],
	scale: Scale,
	laneIndex: number,
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision,
	showEra: boolean
): HTMLElement {
	const lane = document.createElement("div");
	lane.className = `timeline-graph-lane ${laneIndex % 2 === 0 ? "is-even" : "is-odd"}`;

	const label = document.createElement("div");
	label.className = "timeline-graph-lane-label";
	label.textContent = group || "Ungrouped";
	if (group) label.style.borderLeftColor = colorForGroup(group);
	lane.appendChild(label);

	const laneTrack = document.createElement("div");
	laneTrack.className = "timeline-graph-lane-track";

	for (const event of laneEvents) {
		laneTrack.appendChild(renderMarker(event, scale, callbacks, precision, showEra));
	}

	lane.appendChild(laneTrack);
	return lane;
}

function renderTodayLine(now: number, scale: Scale): HTMLElement {
	const line = document.createElement("div");
	line.className = "timeline-graph-today-line";
	line.style.left = `${xFor(now, scale)}%`;

	const label = document.createElement("span");
	label.textContent = "Today";
	line.appendChild(label);

	return line;
}

function renderMarker(
	event: TimelineEvent,
	scale: Scale,
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision,
	showEra: boolean
): HTMLElement {
	const color = event.group
		? colorForGroup(event.group)
		: "var(--interactive-accent, #7c3aed)";
	const startX = xFor(toOrdinal(event.date), scale);

	const el = document.createElement("button");
	el.type = "button";
	el.style.setProperty("--marker-color", color);
	el.addEventListener("click", () => callbacks.onEventClick?.(event));
	attachTooltip(el, event, precision, showEra);

	const labelEl = document.createElement("span");
	labelEl.className = "timeline-graph-marker-label";
	labelEl.textContent = event.title;

	if (event.endDate) {
		const endX = xFor(toOrdinal(event.endDate), scale);
		const width = Math.max(0, endX - startX);
		el.className = "timeline-graph-marker timeline-graph-marker-range";
		el.style.left = `${startX}%`;
		el.style.width = `${width}%`;
		el.appendChild(labelEl);
		return el;
	}

	const wrapper = document.createElement("div");
	wrapper.className = "timeline-graph-marker-point-wrapper";
	wrapper.style.left = `${startX}%`;
	wrapper.style.setProperty("--marker-color", color);

	const stem = document.createElement("div");
	stem.className = "timeline-graph-marker-stem";
	wrapper.appendChild(stem);

	el.className = "timeline-graph-marker timeline-graph-marker-point";
	el.style.removeProperty("left");
	el.appendChild(labelEl);
	wrapper.appendChild(el);

	return wrapper;
}

// Rich hover tooltip (title + date + description) shown on top of the
// browser-native `title` attribute — the native tooltip is kept as a
// fallback for accessibility/no-JS contexts, but is slow to appear and
// unstyled, so a custom element gives the same instant, styled preview
// Chronos offers on hover without requiring a click.
function attachTooltip(
	el: HTMLElement,
	event: TimelineEvent,
	precision: TimelineDatePrecision,
	showEra: boolean
): void {
	const dateLabel = formatTimelineDate(event.date, precision, showEra);
	const fullDateLabel = event.endDate
		? `${dateLabel} → ${formatTimelineDate(event.endDate, precision, showEra)}`
		: dateLabel;
	el.title = event.description ? `${event.title} (${fullDateLabel})\n${event.description}` : `${event.title} (${fullDateLabel})`;

	let tooltip: HTMLElement | null = null;

	el.addEventListener("mouseenter", () => {
		tooltip = document.createElement("div");
		tooltip.className = "timeline-graph-tooltip";

		const titleEl = document.createElement("strong");
		titleEl.textContent = event.title;
		tooltip.appendChild(titleEl);

		const dateEl = document.createElement("div");
		dateEl.className = "timeline-graph-tooltip-date";
		dateEl.textContent = fullDateLabel;
		tooltip.appendChild(dateEl);

		if (event.description) {
			const descEl = document.createElement("div");
			descEl.className = "timeline-graph-tooltip-desc";
			descEl.textContent = event.description;
			tooltip.appendChild(descEl);
		}

		document.body.appendChild(tooltip);
		const rect = el.getBoundingClientRect();
		const tooltipRect = tooltip.getBoundingClientRect();
		tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
		tooltip.style.top = `${rect.top - tooltipRect.height - 8}px`;
	});

	function removeTooltip(): void {
		tooltip?.remove();
		tooltip = null;
	}
	el.addEventListener("mouseleave", removeTooltip);
	el.addEventListener("click", removeTooltip);
}

// Full-height translucent background bands for "period" kind events (e.g.
// eras), drawn behind the axis/lanes rather than inside a lane track, since
// they represent a span of time rather than a specific tracked item.
function renderPeriodBands(
	periods: TimelineEvent[],
	scale: Scale,
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision,
	showEra: boolean
): HTMLElement {
	const wrap = document.createElement("div");
	wrap.className = "timeline-graph-period-bands";

	for (const period of periods) {
		const startX = xFor(toOrdinal(period.date), scale);
		const endX = period.endDate ? xFor(toOrdinal(period.endDate), scale) : startX;
		const width = Math.max(0, endX - startX);

		const band = document.createElement("button");
		band.type = "button";
		band.className = "timeline-graph-period-band";
		band.style.left = `${startX}%`;
		band.style.width = `${width}%`;
		const color = period.group ? colorForGroup(period.group) : undefined;
		if (color) band.style.setProperty("--marker-color", color);
		band.addEventListener("click", () => callbacks.onEventClick?.(period));
		attachTooltip(band, period, precision, showEra);

		const label = document.createElement("span");
		label.className = "timeline-graph-period-band-label";
		label.textContent = period.title;
		band.appendChild(label);

		wrap.appendChild(band);
	}

	return wrap;
}

// Full-height flag line for "marker" kind events — a user-defined
// equivalent of the built-in "today" line, calling out a single date
// independent of any lane (e.g. "World War I begins").
function renderFlagMarker(
	marker: TimelineEvent,
	scale: Scale,
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision,
	showEra: boolean
): HTMLElement {
	const line = document.createElement("button");
	line.type = "button";
	line.className = "timeline-graph-flag-marker";
	line.style.left = `${xFor(toOrdinal(marker.date), scale)}%`;
	const color = marker.group ? colorForGroup(marker.group) : undefined;
	if (color) line.style.setProperty("--marker-color", color);
	line.addEventListener("click", () => callbacks.onEventClick?.(marker));
	attachTooltip(line, marker, precision, showEra);

	const label = document.createElement("span");
	label.textContent = marker.title;
	line.appendChild(label);

	return line;
}
