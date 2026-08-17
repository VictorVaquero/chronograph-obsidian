import { TimelineEvent, TimelineDatePrecision } from "../../types";
import { TimelineRenderCallbacks, groupsOf, renderEmptyState } from "../render-shared";
import { hasAnyBCDate, toOrdinal } from "../../date/timeline-date";
import { AXIS_PADDING_PX, buildScale } from "./scale";
import { computeTicks, renderAxis, renderPeriodLines } from "./ticks";
import { setupZoomAndPan } from "./zoom-pan";
import { renderFlagMarker, renderLane, renderPeriodBands, renderTodayLine, todayAsTimelineDate } from "./markers";
import { renderArrows } from "./arrows";

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

	const root = createDiv();
	root.className = "timeline-graph-horizontal";

	const toolbar = createDiv();
	toolbar.className = "timeline-graph-horizontal-toolbar";

	const zoomOutBtn = createEl("button");
	zoomOutBtn.type = "button";
	zoomOutBtn.className = "timeline-graph-zoom-btn";
	zoomOutBtn.textContent = "−";
	zoomOutBtn.title = "Zoom out";

	const zoomInBtn = createEl("button");
	zoomInBtn.type = "button";
	zoomInBtn.className = "timeline-graph-zoom-btn";
	zoomInBtn.textContent = "+";
	zoomInBtn.title = "Zoom in";

	const fitBtn = createEl("button");
	fitBtn.type = "button";
	fitBtn.className = "timeline-graph-fit-btn";
	fitBtn.textContent = "Fit";
	fitBtn.title = "Reset zoom and scroll position";

	toolbar.append(zoomOutBtn, zoomInBtn, fitBtn);

	const scroller = createDiv();
	scroller.className = "timeline-graph-horizontal-scroller";

	const track = createDiv();
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

	renderArrows(track, events);

	setupZoomAndPan(scroller, track, totalWidth, zoomInBtn, zoomOutBtn, fitBtn);
}
