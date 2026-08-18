import { TimelineEvent, TimelineLayout, TimelineDatePrecision, TimelineCardSide, TimelineLineStyle } from "../types";
import { TimelineRenderCallbacks, TimelineStyleVars, TimelineTheme, applyStyleVars } from "./render-shared";
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
	styleVars?: TimelineStyleVars;
}

// Obsidian doesn't expose a documented theme API. Real Obsidian sets a
// "theme-dark"/"theme-light" class on <body>, which reflects the user's
// in-app theme choice (can diverge from the OS scheme) — checked first. The
// dev-preview harness and its Playwright screenshots don't set that class,
// only prefers-color-scheme, so that's the fallback.
function detectTheme(): TimelineTheme {
	if (typeof document !== "undefined") {
		if (document.body.classList.contains("theme-dark")) return "dark";
		if (document.body.classList.contains("theme-light")) return "light";
	}
	return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

export function renderTimeline(
	container: HTMLElement,
	events: TimelineEvent[],
	layout: TimelineLayout,
	callbacks: TimelineRenderCallbacks = {},
	options: TimelineRenderOptions = {}
): void {
	container.replaceChildren();
	applyStyleVars(container, options.styleVars ?? {});

	const precision = options.precision ?? "day";
	const theme = detectTheme();

	if (layout === "horizontal") {
		renderHorizontalTimeline(container, events, callbacks, precision, theme);
	} else {
		renderVerticalTimeline(
			container,
			events,
			callbacks,
			precision,
			options.verticalCardSide ?? "alternate",
			options.verticalLineStyle ?? "solid",
			theme,
			options.styleVars?.density ?? "comfortable"
		);
	}
}
