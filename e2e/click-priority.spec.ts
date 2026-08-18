import { expect, test } from "@playwright/test";
import { closeSettings, openLayoutAndStyleSettings } from "./helpers";

// Regression coverage for the click-priority fix in styles.css
// (.timeline-graph-lane needs z-index: 2 to outrank .timeline-graph-period-bands'
// z-index: 1): clicking a marker/lane content must hit that marker, not the
// period band sitting underneath it, while bands stay clickable in areas
// with no lane content on top.

test.beforeEach(async ({ page }) => {
	await page.goto("/src/dev/preview.html");
	await openLayoutAndStyleSettings(page);
	await page.selectOption("#layout-select", "horizontal");
	await closeSettings(page);
	await page.click("#btn-ancient");
});

test("clicking a lane marker logs that event, not the underlying period band", async ({ page }) => {
	// "Julius Caesar assassinated" (a plain lane event) falls inside the date
	// range of the "Iron Age" period band, so this exercises the overlap case.
	const marker = page.locator(".timeline-graph-marker-point", { hasText: "Julius Caesar assassinated" });
	await marker.scrollIntoViewIfNeeded();
	await marker.click();
	await expect(page.locator("#log")).toContainText("Julius Caesar assassinated");
});

test("clicking a period band with no marker on top logs the period", async ({ page }) => {
	const band = page.locator(".timeline-graph-period-band", { hasText: "Bronze Age" });
	// Click near the band's left edge, away from any marker that might overlap it.
	await band.click({ position: { x: 4, y: 4 } });
	await expect(page.locator("#log")).toContainText("Bronze Age");
});

test("clicking a flag marker logs that event", async ({ page }) => {
	const flag = page.locator(".timeline-graph-flag-marker", { hasText: "Eruption of Vesuvius" });
	await flag.scrollIntoViewIfNeeded();
	await flag.click();
	await expect(page.locator("#log")).toContainText("Eruption of Vesuvius");
});
