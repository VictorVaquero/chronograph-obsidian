import { TimelineEvent, TimelineDatePrecision } from "../../types";
import { TimelineDate, formatTimelineDate, toOrdinal } from "../../date/timeline-date";
import { TimelineRenderCallbacks, attachHoverPreview, colorForEvent, colorForGroup } from "../render-shared";
import { Scale, xFor } from "./scale";

export function todayAsTimelineDate(): TimelineDate {
	const d = new Date();
	return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function renderLane(
	group: string,
	laneEvents: TimelineEvent[],
	scale: Scale,
	laneIndex: number,
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision,
	showEra: boolean
): HTMLElement {
	const lane = createDiv();
	lane.className = `timeline-graph-lane ${laneIndex % 2 === 0 ? "is-even" : "is-odd"}`;

	const label = createDiv();
	label.className = "timeline-graph-lane-label";
	label.textContent = group || "Ungrouped";
	if (group) label.style.borderLeftColor = colorForGroup(group);
	lane.appendChild(label);

	const laneTrack = createDiv();
	laneTrack.className = "timeline-graph-lane-track";

	for (const event of laneEvents) {
		laneTrack.appendChild(renderMarker(event, scale, callbacks, precision, showEra));
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
	showEra: boolean
): HTMLElement {
	const color = colorForEvent(event) ?? "var(--interactive-accent, #7c3aed)";
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

	const stem = createDiv();
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
	showEra: boolean
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
		const color = colorForEvent(period);
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
	showEra: boolean
): HTMLElement {
	const line = createEl("button");
	line.type = "button";
	line.dataset.timelineEventId = marker.id;
	line.className = "timeline-graph-flag-marker";
	line.style.left = `${xFor(toOrdinal(marker.date), scale)}%`;
	const color = colorForEvent(marker);
	if (color) line.style.setProperty("--marker-color", color);
	line.addEventListener("click", () => callbacks.onEventClick?.(marker));
	attachTooltip(line, marker, precision, showEra);
	attachHoverPreview(line, marker, callbacks);

	const label = createSpan();
	label.textContent = marker.title;
	line.appendChild(label);

	return line;
}
