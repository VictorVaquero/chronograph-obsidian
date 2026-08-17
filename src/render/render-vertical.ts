import { TimelineEvent, TimelineDatePrecision, TimelineCardSide, TimelineLineStyle } from "../types";
import { TimelineRenderCallbacks, attachHoverPreview, colorForEvent, renderEmptyState } from "./render-shared";
import {
	bucketOf,
	compareTimelineDates,
	formatTimelineDateRange,
	hasAnyBCDate,
	toOrdinal,
} from "../date/timeline-date";
import { setupVerticalZoom } from "./vertical-zoom-pan";

export function renderVerticalTimeline(
	container: HTMLElement,
	events: TimelineEvent[],
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision = "day",
	cardSide: TimelineCardSide = "alternate",
	lineStyle: TimelineLineStyle = "solid"
): void {
	if (events.length === 0) {
		renderEmptyState(
			container,
			"No events matched this view's query and date field."
		);
		return;
	}

	const showEra = hasAnyBCDate(events.flatMap((e) => (e.endDate ? [e.date, e.endDate] : [e.date])));

	const spine = createDiv();
	spine.className = `timeline-graph-spine timeline-graph-spine-${cardSide}`;

	const line = createDiv();
	line.className = `timeline-graph-spine-line timeline-graph-spine-line-${lineStyle}`;
	spine.appendChild(line);

	const todayIndex = findTodayInsertionIndex(events);

	let previousBucketKey: string | null = null;
	events.forEach((event, index) => {
		if (index === todayIndex) {
			spine.appendChild(renderTodayMarker());
		}

		const bucket = bucketOf(event.date, precision, showEra);
		if (bucket.label && bucket.key !== previousBucketKey) {
			spine.appendChild(renderPeriodDivider(bucket.label));
		}
		previousBucketKey = bucket.key;

		const alignLeft = cardSide === "alternate" ? index % 2 === 0 : cardSide === "left";
		spine.appendChild(renderNode(event, alignLeft, callbacks, precision, showEra));
	});
	if (todayIndex === events.length) {
		spine.appendChild(renderTodayMarker());
	}

	const root = createDiv();
	root.className = "timeline-graph-vertical";

	const toolbar = createDiv();
	toolbar.className = "timeline-graph-vertical-toolbar";

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
	fitBtn.title = "Reset zoom";

	toolbar.append(zoomOutBtn, zoomInBtn, fitBtn);

	if (callbacks.onExportSnapshot) {
		const exportBtn = createEl("button");
		exportBtn.type = "button";
		exportBtn.className = "timeline-graph-export-btn";
		exportBtn.textContent = "Export snapshot";
		exportBtn.title = "Save a static svg snapshot of this timeline to the vault";
		exportBtn.addEventListener("click", () => callbacks.onExportSnapshot?.());
		toolbar.append(exportBtn);
	}

	root.append(toolbar, spine);
	container.appendChild(root);

	setupVerticalZoom(root, spine, zoomInBtn, zoomOutBtn, fitBtn);
}

function renderPeriodDivider(label: string): HTMLElement {
	const divider = createDiv();
	divider.className = "timeline-graph-period-divider";
	const span = createSpan();
	span.textContent = label;
	divider.appendChild(span);
	return divider;
}

function renderNode(
	event: TimelineEvent,
	alignLeft: boolean,
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision,
	showEra: boolean
): HTMLElement {
	const node = createDiv();
	node.className = `timeline-graph-node ${alignLeft ? "is-left" : "is-right"}`;

	const color = colorForEvent(event);

	const dot = createDiv();
	dot.className = "timeline-graph-node-dot";
	if (color) dot.style.setProperty("--marker-color", color);
	node.appendChild(dot);

	const connector = createDiv();
	connector.className = "timeline-graph-connector";
	if (color) connector.style.setProperty("--marker-color", color);
	node.appendChild(connector);

	const card = createDiv();
	card.className = "timeline-graph-card";
	if (color) card.style.setProperty("--marker-color", color);

	const dateEl = createSpan();
	dateEl.className = "timeline-graph-card-date";
	dateEl.textContent = formatTimelineDateRange(event.date, event.endDate, precision, showEra);
	card.appendChild(dateEl);

	const link = createEl("a");
	link.className = "timeline-graph-card-title";
	link.textContent = event.title;
	link.href = "#";
	link.addEventListener("click", (evt) => {
		evt.preventDefault();
		callbacks.onEventClick?.(event);
	});
	attachHoverPreview(link, event, callbacks);
	card.appendChild(link);

	if (event.group) {
		const badge = createSpan();
		badge.className = "timeline-graph-card-badge";
		badge.textContent = event.group;
		card.appendChild(badge);
	}

	if (event.description) {
		const descEl = createEl("p");
		descEl.className = "timeline-graph-card-desc";
		descEl.textContent = event.description;
		card.appendChild(descEl);
	}

	node.appendChild(card);
	return node;
}

function renderTodayMarker(): HTMLElement {
	const marker = createDiv();
	marker.className = "timeline-graph-today";
	const label = createSpan();
	label.textContent = "Today";
	marker.appendChild(label);
	return marker;
}

function findTodayInsertionIndex(events: TimelineEvent[]): number {
	const now = toOrdinal(todayAsTimelineDate());
	const ascending =
		events.length < 2 || compareTimelineDates(events[0].date, events[events.length - 1].date) <= 0;
	const index = events.findIndex((e) =>
		ascending ? toOrdinal(e.date) > now : toOrdinal(e.date) < now
	);
	if (index === -1) return events.length;
	return index;
}

function todayAsTimelineDate() {
	const d = new Date();
	return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}
