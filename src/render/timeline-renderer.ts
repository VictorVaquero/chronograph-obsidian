import { TimelineEvent, TimelineLayout, TimelineDatePrecision, TimelineCardSide, TimelineLineStyle } from "../types";
import { TimelineRenderCallbacks } from "./render-shared";
import { renderVerticalTimeline } from "./render-vertical";
import { renderHorizontalTimeline } from "./horizontal";

// Pure DOM rendering, decoupled from Obsidian's ItemView/App so it can be
// exercised both inside the plugin and in the standalone dev harness
// (src/dev/preview.ts). createDiv/createEl/createSpan are used throughout,
// same as Obsidian's real runtime provides — the dev harness supplies its
// own polyfill (src/dev/obsidian-dom-polyfill.ts) so this still runs without
// a real Obsidian instance.

export type { TimelineRenderCallbacks } from "./render-shared";
export { renderEmptyState, renderErrorState } from "./render-shared";

export interface TimelineRenderOptions {
	precision?: TimelineDatePrecision;
	/** Vertical layout only. */
	verticalCardSide?: TimelineCardSide;
	/** Vertical layout only. */
	verticalLineStyle?: TimelineLineStyle;
}

export function renderTimeline(
	container: HTMLElement,
	events: TimelineEvent[],
	layout: TimelineLayout,
	callbacks: TimelineRenderCallbacks = {},
	options: TimelineRenderOptions = {}
): void {
	container.replaceChildren();

	const precision = options.precision ?? "day";

	if (layout === "horizontal") {
		renderHorizontalTimeline(container, events, callbacks, precision);
	} else {
		renderVerticalTimeline(
			container,
			events,
			callbacks,
			precision,
			options.verticalCardSide ?? "alternate",
			options.verticalLineStyle ?? "solid"
		);
	}
}
