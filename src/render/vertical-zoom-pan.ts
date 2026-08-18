const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.15;

// Unlike the horizontal axis (percent-positioned children rescale for free
// off a resized track), the vertical layout is a normal flowing card list
// with no inherent "scale" concept. Zoom here is a CSS transform: scale()
// on the spine, which enlarges cards/spacing/fonts together uniformly.
// Panning is left to native page/pane scroll rather than a nested scroll
// region, since the vertical layout has no fixed height to scroll within.
export function setupVerticalZoom(
	container: HTMLElement,
	spine: HTMLElement,
	zoomInBtn: HTMLButtonElement,
	zoomOutBtn: HTMLButtonElement,
	fitBtn: HTMLButtonElement,
	onZoomChange?: () => void
): void {
	let zoom = 1;

	function applyZoom(newZoom: number): void {
		zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
		spine.style.transform = `scale(${zoom})`;
		onZoomChange?.();
	}

	container.addEventListener(
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
