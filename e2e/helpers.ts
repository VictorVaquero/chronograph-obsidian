import { Page } from "@playwright/test";

// The dev-preview harness moved layout/card-side/line-style controls behind
// a "Layout & style options" toggle inside the settings modal (previously
// they were always-visible top-level <select>s). This opens the modal and
// enables that toggle group if it isn't already, leaving the #layout-select
// etc. controls present in the DOM for a follow-up page.selectOption() call
// -- callers must call closeSettings() once done to unblock the rest of the
// page (the modal backdrop intercepts pointer events while open).
export async function openLayoutAndStyleSettings(page: Page): Promise<void> {
	await page.click("#open-settings");
	const item = page.locator(".setting-item", { hasText: "Layout & style options" });
	const toggle = item.locator("input[type=checkbox]");
	if (!(await toggle.isChecked())) await item.locator(".slider").click();
}

export async function closeSettings(page: Page): Promise<void> {
	await page.click("#close-settings");
}
