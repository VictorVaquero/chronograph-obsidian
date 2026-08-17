import { describe, expect, it } from "vitest";
import { setupVerticalZoom } from "./vertical-zoom-pan";

function makeDom(): {
	container: HTMLElement;
	spine: HTMLElement;
	zoomInBtn: HTMLButtonElement;
	zoomOutBtn: HTMLButtonElement;
	fitBtn: HTMLButtonElement;
} {
	const container = document.createElement("div");
	const spine = document.createElement("div");
	container.appendChild(spine);
	document.body.appendChild(container);
	const zoomInBtn = document.createElement("button");
	const zoomOutBtn = document.createElement("button");
	const fitBtn = document.createElement("button");
	return { container, spine, zoomInBtn, zoomOutBtn, fitBtn };
}

describe("setupVerticalZoom", () => {
	it("scales the spine up on zoom in", () => {
		const { container, spine, zoomInBtn, zoomOutBtn, fitBtn } = makeDom();
		setupVerticalZoom(container, spine, zoomInBtn, zoomOutBtn, fitBtn);
		zoomInBtn.click();
		expect(spine.style.transform).toBe("scale(1.15)");
	});

	it("does not zoom out below 1x", () => {
		const { container, spine, zoomInBtn, zoomOutBtn, fitBtn } = makeDom();
		setupVerticalZoom(container, spine, zoomInBtn, zoomOutBtn, fitBtn);
		zoomOutBtn.click();
		expect(spine.style.transform).toBe("scale(1)");
	});

	it("resets to 1x on fit", () => {
		const { container, spine, zoomInBtn, zoomOutBtn, fitBtn } = makeDom();
		setupVerticalZoom(container, spine, zoomInBtn, zoomOutBtn, fitBtn);
		zoomInBtn.click();
		zoomInBtn.click();
		fitBtn.click();
		expect(spine.style.transform).toBe("scale(1)");
	});

	it("caps zoom in at the max", () => {
		const { container, spine, zoomInBtn, zoomOutBtn, fitBtn } = makeDom();
		setupVerticalZoom(container, spine, zoomInBtn, zoomOutBtn, fitBtn);
		for (let i = 0; i < 30; i++) zoomInBtn.click();
		expect(spine.style.transform).toBe("scale(3)");
	});
});
