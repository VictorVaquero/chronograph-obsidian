import { describe, expect, it } from "vitest";
import { setupZoomAndPan } from "./zoom-pan";

function makeDom(): { scroller: HTMLElement; track: HTMLElement; zoomInBtn: HTMLButtonElement; zoomOutBtn: HTMLButtonElement; fitBtn: HTMLButtonElement } {
	const scroller = document.createElement("div");
	const track = document.createElement("div");
	scroller.appendChild(track);
	document.body.appendChild(scroller);
	const zoomInBtn = document.createElement("button");
	const zoomOutBtn = document.createElement("button");
	const fitBtn = document.createElement("button");
	return { scroller, track, zoomInBtn, zoomOutBtn, fitBtn };
}

describe("setupZoomAndPan", () => {
	it("calls onZoomChange after zooming in", () => {
		const { scroller, track, zoomInBtn, zoomOutBtn, fitBtn } = makeDom();
		let calls = 0;
		setupZoomAndPan(scroller, track, 1000, zoomInBtn, zoomOutBtn, fitBtn, () => calls++);
		zoomInBtn.click();
		expect(calls).toBe(1);
	});

	it("calls onZoomChange after zooming out", () => {
		const { scroller, track, zoomInBtn, zoomOutBtn, fitBtn } = makeDom();
		let calls = 0;
		setupZoomAndPan(scroller, track, 1000, zoomInBtn, zoomOutBtn, fitBtn, () => calls++);
		zoomOutBtn.click();
		expect(calls).toBe(1);
	});

	it("calls onZoomChange after fit", () => {
		const { scroller, track, zoomInBtn, zoomOutBtn, fitBtn } = makeDom();
		let calls = 0;
		setupZoomAndPan(scroller, track, 1000, zoomInBtn, zoomOutBtn, fitBtn, () => calls++);
		fitBtn.click();
		expect(calls).toBe(1);
	});

	it("works without an onZoomChange callback", () => {
		const { scroller, track, zoomInBtn, zoomOutBtn, fitBtn } = makeDom();
		setupZoomAndPan(scroller, track, 1000, zoomInBtn, zoomOutBtn, fitBtn);
		expect(() => zoomInBtn.click()).not.toThrow();
	});
});
