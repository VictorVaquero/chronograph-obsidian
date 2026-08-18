const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.15;

// Unlike the horizontal axis (percent-positioned children rescale for free
// off a resized track), the vertical layout is a normal flowing card list
// with no inherent "scale" concept. Zoom here uses the CSS `zoom` property
// (not `transform: scale()`) on the spine, which enlarges cards/spacing/fonts
// together uniformly. `zoom` (unlike `transform`) is a real layout property —
// it grows the element's own box, so an `overflow-x: auto` ancestor picks up
// the extra scrollWidth for free and the overflowing side can be scrolled
// into view. `transform: scale()` was tried first, but transforms are
// paint-only and never affect layout size, so nothing made the overflow
// reachable — panning is left to native scroll here as a result.
export function setupVerticalZoom(
	scrollRegion: HTMLElement,
	spine: HTMLElement,
	zoomInBtn: HTMLButtonElement,
	zoomOutBtn: HTMLButtonElement,
	fitBtn: HTMLButtonElement,
	onZoomChange?: () => void
): void {
	let zoom = 1;

	function applyZoom(newZoom: number): void {
		zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
		spine.setCssStyles({ zoom: String(zoom) });
		onZoomChange?.();
	}

	scrollRegion.addEventListener(
		"wheel",
		(evt) => {
			if (!evt.ctrlKey && !evt.metaKey) return;
			evt.preventDefault();
			const direction = evt.deltaY < 0 ? 1 : -1;
			applyZoom(zoom * Math.pow(ZOOM_STEP, direction));
		},
		{ passive: false }
	);

	zoomInBtn.addEventListener("click", () => applyZoom(zoom * ZOOM_STEP));
	zoomOutBtn.addEventListener("click", () => applyZoom(zoom / ZOOM_STEP));
	fitBtn.addEventListener("click", () => applyZoom(1));
}
