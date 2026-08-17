const MIN_ZOOM = 1;
const MAX_ZOOM = 12;
const ZOOM_STEP = 1.15;

// Zoom resizes the track element's width; since every child is positioned
// with `left`/`width` in percent (see xFor), resizing the track rescales
// every child's effective pixel position for free — no per-element layout
// recompute needed on every wheel tick. Pan is just native scroll. Zooming
// keeps the pointer's calendar position fixed under the cursor by adjusting
// scrollLeft after the resize; dragging pans via scrollLeft deltas.
export function setupZoomAndPan(
	scroller: HTMLElement,
	track: HTMLElement,
	baseWidth: number,
	zoomInBtn: HTMLButtonElement,
	zoomOutBtn: HTMLButtonElement,
	fitBtn: HTMLButtonElement
): void {
	let zoom = 1;

	function applyZoom(newZoom: number, pivotClientX?: number): void {
		const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
		const rect = scroller.getBoundingClientRect();
		const pivotX = pivotClientX ?? rect.left + rect.width / 2;
		const scrollerOffsetX = pivotX - rect.left;
		const contentX = scroller.scrollLeft + scrollerOffsetX;
		const ratio = contentX / (baseWidth * zoom);

		zoom = clamped;
		track.style.width = `${baseWidth * zoom}px`;

		const newContentX = ratio * baseWidth * zoom;
		scroller.scrollLeft = newContentX - scrollerOffsetX;
	}

	scroller.addEventListener(
		"wheel",
		(evt) => {
			if (!evt.ctrlKey && !evt.metaKey && Math.abs(evt.deltaY) <= Math.abs(evt.deltaX)) {
				// Predominantly horizontal wheel gesture (trackpad pan) — let native scroll handle it.
				return;
			}
			evt.preventDefault();
			const direction = evt.deltaY < 0 ? 1 : -1;
			applyZoom(zoom * Math.pow(ZOOM_STEP, direction), evt.clientX);
		},
		{ passive: false }
	);

	let isDragging = false;
	let dragStartX = 0;
	let dragStartScrollLeft = 0;

	scroller.addEventListener("pointerdown", (evt) => {
		if (evt.target instanceof HTMLElement && evt.target.closest("button, a")) return;
		isDragging = true;
		dragStartX = evt.clientX;
		dragStartScrollLeft = scroller.scrollLeft;
		scroller.classList.add("is-panning");
		scroller.setPointerCapture(evt.pointerId);
	});
	scroller.addEventListener("pointermove", (evt) => {
		if (!isDragging) return;
		scroller.scrollLeft = dragStartScrollLeft - (evt.clientX - dragStartX);
	});
	function endDrag(evt: PointerEvent): void {
		if (!isDragging) return;
		isDragging = false;
		scroller.classList.remove("is-panning");
		scroller.releasePointerCapture(evt.pointerId);
	}
	scroller.addEventListener("pointerup", endDrag);
	scroller.addEventListener("pointercancel", endDrag);

	zoomInBtn.addEventListener("click", () => applyZoom(zoom * ZOOM_STEP));
	zoomOutBtn.addEventListener("click", () => applyZoom(zoom / ZOOM_STEP));
	fitBtn.addEventListener("click", () => {
		zoom = 1;
		track.style.width = `${baseWidth}px`;
		scroller.scrollLeft = 0;
	});
}
