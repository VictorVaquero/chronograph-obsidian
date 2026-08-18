import { TimelineEvent, TimelineDatePrecision } from "../../types";
import { TimelineRenderCallbacks, TimelineTheme, buildGroupColorMap, groupsOf, renderEmptyState } from "../render-shared";
import { hasAnyBCDate, toOrdinal } from "../../date/timeline-date";
import { AXIS_PADDING_PX, buildScale } from "./scale";
import { computeTicks, renderAxis, renderCompressionMarkers, renderPeriodLines } from "./ticks";
import { setupZoomAndPan } from "./zoom-pan";
import { renderFlagMarker, renderLane, renderPeriodBands, renderTodayLine, todayAsTimelineDate } from "./markers";
import { renderArrows } from "./arrows";

export function renderHorizontalTimeline(
	container: HTMLElement,
	events: TimelineEvent[],
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision = "day",
	theme: TimelineTheme = "light"
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

	const groupColors = buildGroupColorMap(groupsOf(events), theme);

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

	if (callbacks.onCreateEvent) {
		const newEventBtn = createEl("button");
		newEventBtn.type = "button";
		newEventBtn.className = "timeline-graph-new-event-btn";
		newEventBtn.textContent = "+ new event";
		newEventBtn.title = "Create a new event";
		newEventBtn.addEventListener("click", () => callbacks.onCreateEvent?.());
		toolbar.append(newEventBtn);
	}

	if (callbacks.onConfigure) {
		const configureBtn = createEl("button");
		configureBtn.type = "button";
		configureBtn.className = "timeline-graph-configure-btn";
		configureBtn.textContent = "⚙";
		configureBtn.title = "Edit this timeline's settings";
		configureBtn.addEventListener("click", () => callbacks.onConfigure?.());
		toolbar.append(configureBtn);
	}

	if (callbacks.onExportSnapshot) {
		const exportBtn = createEl("button");
		exportBtn.type = "button";
		exportBtn.className = "timeline-graph-export-btn";
		exportBtn.textContent = "Export snapshot";
		exportBtn.title = "Save a static svg snapshot of this timeline to the vault";
		exportBtn.addEventListener("click", () => callbacks.onExportSnapshot?.());
		toolbar.append(exportBtn);
	}

	const scroller = createDiv();
	scroller.className = "timeline-graph-horizontal-scroller";

	const track = createDiv();
	track.className = "timeline-graph-horizontal-track";
	track.style.width = `${totalWidth}px`;

	const ticks = computeTicks(scale, precision, showEra);
	track.appendChild(renderPeriodBands(periodEvents, scale, callbacks, precision, showEra, groupColors));
	track.appendChild(renderAxis(ticks, scale));
	track.appendChild(renderPeriodLines(ticks, scale));
	track.appendChild(renderCompressionMarkers(scale));

	groupsOf(laneEvents).forEach((group, laneIndex) => {
		const eventsInLane = laneEvents.filter((e) => (e.group ?? "") === group);
		track.appendChild(
			renderLane(group, eventsInLane, scale, laneIndex, callbacks, precision, showEra, groupColors)
		);
	});

	for (const marker of markerEvents) {
		track.appendChild(renderFlagMarker(marker, scale, callbacks, precision, showEra, groupColors));
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

	setupZoomAndPan(scroller, track, totalWidth, zoomInBtn, zoomOutBtn, fitBtn, () =>
		renderArrows(track, events)
	);
}
