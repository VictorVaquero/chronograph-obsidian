import { expect, test } from "@playwright/test";
import { closeSettings, openLayoutAndStyleSettings } from "./helpers";

// Pixel-level regression coverage for the dev-preview harness. Screenshots
// are scoped to the #app container (not the full page/toolbar) so changes
// to the preview harness itself don't invalidate baselines that only care
// about the renderer's actual output.

test.beforeEach(async ({ page }) => {
	await page.goto("/src/dev/preview.html");
});

test("vertical layout with sample data (light)", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "light" });
	await expect(page.locator("#app")).toHaveScreenshot("vertical-sample-light.png");
});

test("vertical layout with sample data (dark)", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "dark" });
	await expect(page.locator("#app")).toHaveScreenshot("vertical-sample-dark.png");
});

test("horizontal layout with sample data (light)", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "light" });
	await openLayoutAndStyleSettings(page);
	await page.selectOption("#layout-select", "horizontal");
	await closeSettings(page);
	await expect(page.locator("#app")).toHaveScreenshot("horizontal-sample-light.png");
});

test("horizontal layout with sample data (dark)", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "dark" });
	await openLayoutAndStyleSettings(page);
	await page.selectOption("#layout-select", "horizontal");
	await closeSettings(page);
	await expect(page.locator("#app")).toHaveScreenshot("horizontal-sample-dark.png");
});

test("horizontal layout with ancient BC/AD data, including period bands and a flag marker", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "light" });
	await openLayoutAndStyleSettings(page);
	await page.selectOption("#layout-select", "horizontal");
	await closeSettings(page);
	await page.click("#btn-ancient");
	await expect(page.locator("#app")).toHaveScreenshot("horizontal-ancient-light.png");
});

test("vertical layout, cards pinned right, dashed line", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "light" });
	await openLayoutAndStyleSettings(page);
	await page.selectOption("#card-side-select", "right");
	await page.selectOption("#line-style-select", "dashed");
	await closeSettings(page);
	await expect(page.locator("#app")).toHaveScreenshot("vertical-right-dashed-light.png");
});

test("empty state (light)", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "light" });
	await page.click("#btn-empty");
	await expect(page.locator("#app")).toHaveScreenshot("empty-state-light.png");
});

test("error state (light)", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "light" });
	await page.click("#btn-error");
	await expect(page.locator("#app")).toHaveScreenshot("error-state-light.png");
});
