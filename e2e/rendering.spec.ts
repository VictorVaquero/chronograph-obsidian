import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/src/dev/preview.html");
});

test("renders the vertical timeline with sample data by default", async ({ page }) => {
	await expect(page.locator(".timeline-graph-spine")).toBeVisible();
	await expect(page.locator(".timeline-graph-node")).toHaveCount(7);
});

test("switching to horizontal layout renders lanes and an axis", async ({ page }) => {
	await page.selectOption("#layout-select", "horizontal");
	await expect(page.locator(".timeline-graph-horizontal")).toBeVisible();
	await expect(page.locator(".timeline-graph-axis-tick").first()).toBeVisible();
	await expect(page.locator(".timeline-graph-lane").first()).toBeVisible();
});

test("empty state button replaces the timeline with an empty message", async ({ page }) => {
	await page.click("#btn-empty");
	await expect(page.locator(".timeline-graph-empty")).toBeVisible();
	await expect(page.locator(".timeline-graph-spine")).toHaveCount(0);
});

test("error state button replaces the timeline with a prefixed error message", async ({ page }) => {
	await page.click("#btn-error");
	const error = page.locator(".timeline-graph-error");
	await expect(error).toBeVisible();
	await expect(error).toContainText("Chronograph error:");
});

test("clicking a vertical card title logs the clicked event", async ({ page }) => {
	await page.click(".timeline-graph-card-title >> text=Kickoff meeting");
	await expect(page.locator("#log")).toContainText("Kickoff meeting");
	await expect(page.locator("#log")).toContainText("Meetings/Kickoff.md");
});

test("zoom-in button widens the horizontal track", async ({ page }) => {
	await page.selectOption("#layout-select", "horizontal");
	const track = page.locator(".timeline-graph-horizontal-track");
	const initialWidth = await track.evaluate((el) => el.getBoundingClientRect().width);

	await page.click('button:has-text("+")');
	await page.click('button:has-text("+")');

	const zoomedWidth = await track.evaluate((el) => el.getBoundingClientRect().width);
	expect(zoomedWidth).toBeGreaterThan(initialWidth);
});

test("fit button resets zoom back to the base track width", async ({ page }) => {
	await page.selectOption("#layout-select", "horizontal");
	const track = page.locator(".timeline-graph-horizontal-track");
	const baseWidth = await track.evaluate((el) => el.getBoundingClientRect().width);

	await page.click('button:has-text("+")');
	await page.click('button:has-text("+")');
	await page.click("text=Fit");

	const resetWidth = await track.evaluate((el) => el.getBoundingClientRect().width);
	expect(resetWidth).toBeCloseTo(baseWidth, 0);
});
