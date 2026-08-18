import { TimelineEvent } from "../types";

export interface TimelineRenderCallbacks {
	/** Called when a user activates an event (e.g. clicks its title/marker). */
	onEventClick?: (event: TimelineEvent) => void;
	/** Called on mouseover of an event's title/marker, to trigger Obsidian's native hover-link preview popover. */
	onEventHover?: (event: TimelineEvent, evt: MouseEvent, targetEl: HTMLElement) => void;
	/**
	 * Called when the user clicks the "+ New event" toolbar button (horizontal
	 * layout only). Omit to hide the button, e.g. for read-only/code-block
	 * timelines with no view config to create events against.
	 */
	onCreateEvent?: () => void;
	/**
	 * Called when the user clicks the "Export snapshot" toolbar button.
	 * Omit to hide the button, e.g. for read-only/code-block timelines with
	 * no view config to name the exported file after.
	 */
	onExportSnapshot?: () => void;
}

export function attachHoverPreview(
	el: HTMLElement,
	event: TimelineEvent,
	callbacks: TimelineRenderCallbacks
): void {
	el.addEventListener("mouseover", (evt) => {
		callbacks.onEventHover?.(event, evt, el);
	});
}

export function renderEmptyState(container: HTMLElement, message: string): void {
	container.replaceChildren();
	const el = createDiv();
	el.className = "timeline-graph-empty";
	const p = createEl("p");
	p.textContent = message;
	el.appendChild(p);
	container.appendChild(el);
}

export function renderErrorState(container: HTMLElement, message: string): void {
	container.replaceChildren();
	const el = createDiv();
	el.className = "timeline-graph-error";
	const p = createEl("p");
	p.textContent = `Chronograph error: ${message}`;
	el.appendChild(p);
	container.appendChild(el);
}

export type TimelineTheme = "light" | "dark";

// Curated, colorblind-checked categorical palette (8 slots, ordered so
// adjacent slots stay distinguishable under color-vision deficiency),
// assigned to groups in first-seen order per render by buildGroupColorMap.
// One palette only, deliberately: a per-view palette *choice* would key into
// a Record<string, Record<TimelineTheme, string[]>> here instead of this
// flat constant, with buildGroupColorMap taking the palette name as a third
// parameter (defaulting to "default") — left as a future extension point,
// not built now.
const PALETTE: Record<TimelineTheme, string[]> = {
	light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
	dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
};

// Deterministic hash-to-hue fallback for groups beyond the curated palette's
// 8 slots, so a vault with many groups still gets a stable (if less
// carefully chosen) color per group rather than repeats or an error.
function hashToHsl(group: string): string {
	let hash = 0;
	for (let i = 0; i < group.length; i++) {
		hash = (hash << 5) - hash + group.charCodeAt(i);
		hash |= 0;
	}
	const hue = Math.abs(hash) % 360;
	return `hsl(${hue}, 65%, 55%)`;
}

// Assigns each group a color: the first 8 distinct groups (in first-seen
// order) get the curated palette's slots in order, so the same set of groups
// always renders the same colors regardless of group name; the 9th+ group
// falls back to the deterministic hash.
export function buildGroupColorMap(groups: string[], theme: TimelineTheme): Map<string, string> {
	const palette = PALETTE[theme];
	const map = new Map<string, string>();
	groups.forEach((group, i) => {
		map.set(group, i < palette.length ? palette[i] : hashToHsl(group));
	});
	return map;
}

// An explicit event.color always wins; otherwise fall back to the event's
// group color in the given map, if any.
export function colorForEvent(event: TimelineEvent, groupColors: Map<string, string>): string | undefined {
	return event.color || (event.group ? groupColors.get(event.group) : undefined);
}

export type TimelineDensity = "compact" | "comfortable" | "spacious";
export type TimelineCardRadius = "none" | "small" | "medium" | "large";
export type TimelineMarkerSize = "small" | "medium" | "large";
export type TimelineSpineThickness = "thin" | "medium" | "thick";
export type TimelineShadowIntensity = "none" | "subtle" | "normal";

export interface TimelineStyleVars {
	density?: TimelineDensity;
	cardRadius?: TimelineCardRadius;
	markerSize?: TimelineMarkerSize;
	spineThickness?: TimelineSpineThickness;
	shadowIntensity?: TimelineShadowIntensity;
}

const DENSITY_GAP: Record<TimelineDensity, string> = {
	compact: "var(--size-4-2)",
	comfortable: "var(--size-4-3)",
	spacious: "var(--size-4-4)",
};

const CARD_RADIUS: Record<TimelineCardRadius, string> = {
	none: "0px",
	small: "var(--radius-s)",
	medium: "var(--radius-m)",
	large: "var(--radius-l, 12px)",
};

const MARKER_SIZE: Record<TimelineMarkerSize, string> = {
	small: "9px",
	medium: "12px",
	large: "16px",
};

const SPINE_THICKNESS: Record<TimelineSpineThickness, string> = {
	thin: "1px",
	medium: "2px",
	thick: "4px",
};

const CARD_SHADOW: Record<TimelineShadowIntensity, string> = {
	none: "none",
	subtle: "0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 1px rgba(0, 0, 0, 0.04)",
	normal: "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)",
};

const CARD_SHADOW_HOVER: Record<TimelineShadowIntensity, string> = {
	none: "none",
	subtle: "0 2px 6px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
	normal: "0 4px 10px rgba(0, 0, 0, 0.16), 0 2px 4px rgba(0, 0, 0, 0.1)",
};

// Applies the given style preset choices as CSS custom properties on the
// render root, once per render — following the same pattern as the
// per-event --marker-color set in render-vertical.ts/horizontal/markers.ts,
// just at container scope instead of per-element. styles.css consumes these
// via var(--timeline-*, <default>), so an unset/omitted value here still
// renders correctly (the CSS-side fallback matches this function's default).
export function applyStyleVars(root: HTMLElement, vars: TimelineStyleVars): void {
	root.style.setProperty("--timeline-density-gap", DENSITY_GAP[vars.density ?? "comfortable"]);
	root.style.setProperty("--timeline-card-radius", CARD_RADIUS[vars.cardRadius ?? "medium"]);
	root.style.setProperty("--timeline-marker-size", MARKER_SIZE[vars.markerSize ?? "medium"]);
	root.style.setProperty("--timeline-spine-thickness", SPINE_THICKNESS[vars.spineThickness ?? "medium"]);
	root.style.setProperty("--timeline-card-shadow", CARD_SHADOW[vars.shadowIntensity ?? "subtle"]);
	root.style.setProperty("--timeline-card-shadow-hover", CARD_SHADOW_HOVER[vars.shadowIntensity ?? "subtle"]);
}

export function groupsOf(events: TimelineEvent[]): string[] {
	const seen = new Set<string>();
	const groups: string[] = [];
	for (const event of events) {
		const group = event.group ?? "";
		if (!seen.has(group)) {
			seen.add(group);
			groups.push(group);
		}
	}
	return groups;
}
