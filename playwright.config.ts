import { defineConfig, devices } from "@playwright/test";

// Drives the standalone dev-preview harness (src/dev/preview.html) — plain
// DOM/CSS with no Obsidian runtime involved, so it's the right target for
// e2e interaction tests (drag-to-pan, wheel-zoom, tooltips, click-through
// priority) as well as later visual regression via toHaveScreenshot().

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: [["html", { open: "never" }]],
	use: {
		baseURL: "http://127.0.0.1:8123",
		trace: "on-first-retry",
		viewport: { width: 1280, height: 800 },
	},
	expect: {
		toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "node esbuild.preview.mjs watch",
		url: "http://127.0.0.1:8123/src/dev/preview.html",
		reuseExistingServer: !process.env.CI,
		stdout: "pipe",
	},
});
