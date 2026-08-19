import { TimelineEvent, TimelineDatePrecision } from "../../types";
import { TimelineDate, formatTimelineDate, toOrdinal } from "../../date/timeline-date";
import { TimelineRenderCallbacks, attachHoverPreview, colorForEvent } from "../render-shared";
import { Scale, xFor, xForPx } from "./scale";

export function todayAsTimelineDate(): TimelineDate {
	const d = new Date();
	return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

// Vertical spacing (in px) between stacked marker rows within a lane, and a
// rough per-character width estimate used to guess a point marker's on-screen
// footprint (dot + gap + padded label) without a real DOM measurement pass.
const STACK_ROW_HEIGHT_PX = 22;
const CHAR_WIDTH_PX = 6;
const DOT_AND_GAP_PX = 20;
const LABEL_PADDING_PX = 8;

function estimateMarkerWidthPx(title: string): number {
	return DOT_AND_GAP_PX + LABEL_PADDING_PX + title.length * CHAR_WIDTH_PX;
}

// Greedily assigns each point event a vertical "row" (0 = the lane's
// baseline/date-spine row) so that two markers whose estimated label
// footprints would overlap horizontally end up on different rows instead of
// drawing on top of each other. Rows grow outward from the spine (0, 1, -1,
// 2, -2, ...) so the default case (no collisions) stays on the baseline and
// only colliding events get displaced above/below it.
function assignStackRows(points: TimelineEvent[], scale: Scale): Map<string, number> {
	const sorted = [...points].sort((a, b) => toOrdinal(a.date) - toOrdinal(b.date));

	// Tracks, per row, the rightmost pixel edge claimed so far by a marker
	// placed on that row.
	const rowRightEdge = new Map<number, number>();
	const rows = new Map<string, number>();

	for (const event of sorted) {
		const x = xForPx(toOrdinal(event.date), scale);
		const width = estimateMarkerWidthPx(event.title);

		let chosen = 0;
		for (let offset = 0; ; offset++) {
			const candidate = offset === 0 ? 0 : offset % 2 === 1 ? Math.ceil(offset / 2) : -Math.ceil(offset / 2);
			const edge = rowRightEdge.get(candidate) ?? -Infinity;
			if (x > edge) {
				chosen = candidate;
				break;
			}
			if (offset > points.length * 2) {
				chosen = candidate;
				break;
			}
		}

		rowRightEdge.set(chosen, x + width);
		rows.set(event.id, chosen);
	}

	return rows;
}

export function renderLane(
	group: string,
	laneEvents: TimelineEvent[],
	scale: Scale,
	laneIndex: number,
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision,
	showEra: boolean,
	groupColors: Map<string, string>
): HTMLElement {
	const lane = createDiv();
	lane.className = `timeline-graph-lane ${laneIndex % 2 === 0 ? "is-even" : "is-odd"}`;

	const label = createDiv();
	label.className = "timeline-graph-lane-label";
	label.textContent = group || "Ungrouped";
	const labelColor = group ? groupColors.get(group) : undefined;
	if (labelColor) label.style.borderLeftColor = labelColor;
	lane.appendChild(label);

	const laneTrack = createDiv();
	laneTrack.className = "timeline-graph-lane-track";

	const points = laneEvents.filter((e) => !e.endDate);
	const stackRows = assignStackRows(points, scale);
	let maxAbsRow = 0;
	for (const row of stackRows.values()) maxAbsRow = Math.max(maxAbsRow, Math.abs(row));

	for (const event of laneEvents) {
		const row = stackRows.get(event.id) ?? 0;
		laneTrack.appendChild(renderMarker(event, scale, callbacks, precision, showEra, groupColors, row));
	}

	if (maxAbsRow > 0) {
		// Grow the lane to fit however many stacked rows this lane's events
		// need, above and below the baseline, plus the row the baseline
		// itself already reserves.
		lane.style.minHeight = `calc(32px + var(--timeline-density-gap, var(--size-4-3)) + ${maxAbsRow * 2 * STACK_ROW_HEIGHT_PX}px)`;
	}

	lane.appendChild(laneTrack);
	return lane;
}

export function renderTodayLine(now: number, scale: Scale): HTMLElement {
	const line = createDiv();
	line.className = "timeline-graph-today-line";
	line.style.left = `${xFor(now, scale)}%`;

	const label = createSpan();
	label.textContent = "Today";
	line.appendChild(label);

	return line;
}

function renderMarker(
	event: TimelineEvent,
	scale: Scale,
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision,
	showEra: boolean,
	groupColors: Map<string, string>,
	stackRow = 0
): HTMLElement {
	const color = colorForEvent(event, groupColors) ?? "var(--interactive-accent)";
	const startX = xFor(toOrdinal(event.date), scale);

	const el = createEl("button");
	el.type = "button";
	el.dataset.timelineEventId = event.id;
	el.style.setProperty("--marker-color", color);
	el.addEventListener("click", () => callbacks.onEventClick?.(event));
	attachTooltip(el, event, precision, showEra);
	attachHoverPreview(el, event, callbacks);

	const labelEl = createSpan();
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

	const wrapper = createDiv();
	wrapper.className = "timeline-graph-marker-point-wrapper";
	wrapper.style.left = `${startX}%`;
	wrapper.style.setProperty("--marker-color", color);
	if (stackRow !== 0) {
		wrapper.classList.add(stackRow > 0 ? "is-stacked-below" : "is-stacked-above");
		wrapper.style.setProperty("--stack-offset", `${Math.abs(stackRow) * STACK_ROW_HEIGHT_PX}px`);
	}

	// The stem always runs from the dot's own (possibly stacked) row back to
	// the lane's baseline, so a marker pushed above/below still points at its
	// exact date on the date spine.
	const stem = createDiv();
	stem.className = "timeline-graph-marker-stem";
	wrapper.appendChild(stem);

	el.className = "timeline-graph-marker timeline-graph-marker-point";
	el.style.removeProperty("left");
	wrapper.appendChild(el);

	// The label sits next to the dot as a wrapper sibling rather than a
	// child of `el` — `el` keeps `overflow: hidden` (shared with the range
	// marker's ellipsis truncation via .timeline-graph-marker), which would
	// silently clip the label to the dot's own tiny box if it were nested
	// inside instead.
	labelEl.className = "timeline-graph-marker-label timeline-graph-marker-label-point";
	wrapper.appendChild(labelEl);

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
		tooltip = createDiv();
		tooltip.className = "timeline-graph-tooltip";

		const titleEl = createEl("strong");
		titleEl.textContent = event.title;
		tooltip.appendChild(titleEl);

		const dateEl = createDiv();
		dateEl.className = "timeline-graph-tooltip-date";
		dateEl.textContent = fullDateLabel;
		tooltip.appendChild(dateEl);

		if (event.description) {
			const descEl = createDiv();
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
export function renderPeriodBands(
	periods: TimelineEvent[],
	scale: Scale,
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision,
	showEra: boolean,
	groupColors: Map<string, string>
): HTMLElement {
	const wrap = createDiv();
	wrap.className = "timeline-graph-period-bands";

	for (const period of periods) {
		const startX = xFor(toOrdinal(period.date), scale);
		const endX = period.endDate ? xFor(toOrdinal(period.endDate), scale) : startX;
		const width = Math.max(0, endX - startX);

		const band = createEl("button");
		band.type = "button";
		band.dataset.timelineEventId = period.id;
		band.className = "timeline-graph-period-band";
		band.style.left = `${startX}%`;
		band.style.width = `${width}%`;
		const color = colorForEvent(period, groupColors);
		if (color) band.style.setProperty("--marker-color", color);
		band.addEventListener("click", () => callbacks.onEventClick?.(period));
		attachTooltip(band, period, precision, showEra);
		attachHoverPreview(band, period, callbacks);

		const label = createSpan();
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
export function renderFlagMarker(
	marker: TimelineEvent,
	scale: Scale,
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision,
	showEra: boolean,
	groupColors: Map<string, string>
): HTMLElement {
	const line = createEl("button");
	line.type = "button";
	line.dataset.timelineEventId = marker.id;
	line.className = "timeline-graph-flag-marker";
	line.style.left = `${xFor(toOrdinal(marker.date), scale)}%`;
	const color = colorForEvent(marker, groupColors);
	if (color) line.style.setProperty("--marker-color", color);
	line.addEventListener("click", () => callbacks.onEventClick?.(marker));
	attachTooltip(line, marker, precision, showEra);
	attachHoverPreview(line, marker, callbacks);

	const label = createSpan();
	label.textContent = marker.title;
	line.appendChild(label);

	return line;
}
