import { TimelineEvent, TimelineDatePrecision, TimelineCardSide, TimelineLineStyle, TimelineDensity } from "../types";
import {
	TimelineRenderCallbacks,
	TimelineTheme,
	attachHoverPreview,
	buildGroupColorMap,
	colorForEvent,
	groupsOf,
	renderEmptyState,
} from "./render-shared";
import {
	bucketOf,
	compareTimelineDates,
	formatTimelineDateRange,
	hasAnyBCDate,
	toOrdinal,
} from "../date/timeline-date";
import { setupVerticalZoom } from "./vertical-zoom-pan";
import { renderRangeBars } from "./range-bars";

export function renderVerticalTimeline(
	container: HTMLElement,
	events: TimelineEvent[],
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision = "day",
	cardSide: TimelineCardSide = "alternate",
	lineStyle: TimelineLineStyle = "solid",
	theme: TimelineTheme = "light",
	density: TimelineDensity = "comfortable"
): void {
	if (events.length === 0) {
		renderEmptyState(
			container,
			"No events matched this view's query and date field."
		);
		return;
	}

	const groupColors = buildGroupColorMap(groupsOf(events), theme);

	const showEra = hasAnyBCDate(events.flatMap((e) => (e.endDate ? [e.date, e.endDate] : [e.date])));

	// Compact density is a dense scannable list, not a two-column layout — so
	// unless the user explicitly picked a side, force everything to one side
	// instead of alternating. That keeps every row's date/range clutter on the
	// same side of the spine, away from the title text, rather than flipping
	// per row.
	const effectiveCardSide = density === "compact" && cardSide === "alternate" ? "right" : cardSide;

	const spine = createDiv();
	spine.className = `timeline-graph-spine timeline-graph-spine-${effectiveCardSide}${
		density === "compact" ? " timeline-graph-spine-compact" : ""
	}`;

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
			spine.appendChild(renderPeriodDivider(bucket.label, density));
		}
		previousBucketKey = bucket.key;

		const alignLeft = effectiveCardSide === "alternate" ? index % 2 === 0 : effectiveCardSide === "left";
		spine.appendChild(
			renderNode(event, alignLeft, effectiveCardSide !== "alternate", callbacks, precision, showEra, groupColors, density)
		);
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

	// CSS `zoom` (used for the +/- zoom controls) is a real layout property,
	// so this scroll region picks up the extra scrollWidth for free and the
	// overflowing side can be scrolled into view — see vertical-zoom-pan.ts.
	const scrollRegion = createDiv();
	scrollRegion.className = "timeline-graph-vertical-scroll";
	scrollRegion.appendChild(spine);

	root.append(toolbar, scrollRegion);
	container.appendChild(root);

	renderRangeBars(spine, events);

	setupVerticalZoom(scrollRegion, spine, zoomInBtn, zoomOutBtn, fitBtn, () => renderRangeBars(spine, events));
}

function renderPeriodDivider(label: string, density: TimelineDensity): HTMLElement {
	const divider = createDiv();
	divider.className =
		density === "compact"
			? "timeline-graph-period-divider timeline-graph-period-divider-compact"
			: "timeline-graph-period-divider";
	const span = createSpan();
	span.textContent = label;
	divider.appendChild(span);
	return divider;
}

function renderNode(
	event: TimelineEvent,
	alignLeft: boolean,
	fixedSide: boolean,
	callbacks: TimelineRenderCallbacks,
	precision: TimelineDatePrecision,
	showEra: boolean,
	groupColors: Map<string, string>,
	density: TimelineDensity
): HTMLElement {
	const node = createDiv();
	node.className = `timeline-graph-node ${alignLeft ? "is-left" : "is-right"}`;

	const color = colorForEvent(event, groupColors);
	const dateText = formatTimelineDateRange(event.date, event.endDate, precision, showEra);

	// Compact density drops the description/badge/connector entirely and
	// splits the row across the spine instead: the date (plus any range-bar
	// clutter) goes on the side opposite the title, so the title text always
	// reads cleanly with nothing but the spine's dot next to it.
	if (density === "compact") {
		return renderCompactNode(event, alignLeft, fixedSide, callbacks, dateText, color);
	}

	const dot = createDiv();
	dot.className = "timeline-graph-node-dot";
	dot.dataset.timelineEventId = event.id;
	dot.dataset.timelineCardSide = alignLeft ? "left" : "right";
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
	dateEl.textContent = dateText;
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

function renderCompactNode(
	event: TimelineEvent,
	alignLeft: boolean,
	fixedSide: boolean,
	callbacks: TimelineRenderCallbacks,
	dateText: string,
	color: string | undefined
): HTMLElement {
	const node = createDiv();
	node.className = `timeline-graph-node timeline-graph-node-compact ${alignLeft ? "is-left" : "is-right"}${
		fixedSide ? " timeline-graph-node-compact-fixed-side" : ""
	}`;

	const dot = createDiv();
	dot.className = "timeline-graph-node-dot timeline-graph-node-dot-compact";
	dot.dataset.timelineEventId = event.id;
	// The range bar's clutter (date, stub, line) renders on the side opposite
	// the title in compact mode, so the bar must offset toward that same
	// opposite side to stay next to the date column it's annotating.
	dot.dataset.timelineCardSide = alignLeft ? "right" : "left";
	if (color) dot.style.setProperty("--marker-color", color);
	node.appendChild(dot);

	const dateEl = createSpan();
	dateEl.className = "timeline-graph-card-date timeline-graph-card-date-compact";
	dateEl.textContent = dateText;

	const link = createEl("a");
	link.className = "timeline-graph-card-title timeline-graph-card-title-compact";
	link.textContent = event.title;
	link.href = "#";
	link.addEventListener("click", (evt) => {
		evt.preventDefault();
		callbacks.onEventClick?.(event);
	});
	attachHoverPreview(link, event, callbacks);

	// The dot is positioned absolutely (out of flex flow), so only these two
	// remain in flex order — append title-then-date or date-then-title to
	// match which side the title belongs on.
	if (alignLeft) {
		node.append(link, dateEl);
	} else {
		node.append(dateEl, link);
	}

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
