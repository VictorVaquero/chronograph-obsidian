import { describe, expect, it } from "vitest";
import { setupVerticalZoom } from "./vertical-zoom-pan";

function makeDom(): {
	scrollRegion: HTMLElement;
	spine: HTMLElement;
	zoomInBtn: HTMLButtonElement;
	zoomOutBtn: HTMLButtonElement;
	fitBtn: HTMLButtonElement;
} {
	const scrollRegion = document.createElement("div");
	const spine = document.createElement("div");
	scrollRegion.appendChild(spine);
	document.body.appendChild(scrollRegion);
	const zoomInBtn = document.createElement("button");
	const zoomOutBtn = document.createElement("button");
	const fitBtn = document.createElement("button");
	return { scrollRegion, spine, zoomInBtn, zoomOutBtn, fitBtn };
}

describe("setupVerticalZoom", () => {
	it("zooms the spine up on zoom in", () => {
		const { scrollRegion, spine, zoomInBtn, zoomOutBtn, fitBtn } = makeDom();
		setupVerticalZoom(scrollRegion, spine, zoomInBtn, zoomOutBtn, fitBtn);
		zoomInBtn.click();
		expect(spine.style.zoom).toBe("1.15");
	});

	it("does not zoom out below 1x", () => {
		const { scrollRegion, spine, zoomInBtn, zoomOutBtn, fitBtn } = makeDom();
		setupVerticalZoom(scrollRegion, spine, zoomInBtn, zoomOutBtn, fitBtn);
		zoomOutBtn.click();
		expect(spine.style.zoom).toBe("1");
	});

	it("resets to 1x on fit", () => {
		const { scrollRegion, spine, zoomInBtn, zoomOutBtn, fitBtn } = makeDom();
		setupVerticalZoom(scrollRegion, spine, zoomInBtn, zoomOutBtn, fitBtn);
		zoomInBtn.click();
		zoomInBtn.click();
		fitBtn.click();
		expect(spine.style.zoom).toBe("1");
	});

	it("caps zoom in at the max", () => {
		const { scrollRegion, spine, zoomInBtn, zoomOutBtn, fitBtn } = makeDom();
		setupVerticalZoom(scrollRegion, spine, zoomInBtn, zoomOutBtn, fitBtn);
		for (let i = 0; i < 30; i++) zoomInBtn.click();
		expect(spine.style.zoom).toBe("3");
	});
});
