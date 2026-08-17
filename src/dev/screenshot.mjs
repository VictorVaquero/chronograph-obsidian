import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8000/src/dev/preview.html";
const outPath = process.argv[3] ?? "/tmp/timeline-screenshot.png";
const layout = process.argv[4] ?? "vertical";
const dataset = process.argv[5] ?? "sample"; // sample | random | ancient
const precision = process.argv[6]; // optional override, e.g. "century"

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });

const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));
page.on("console", (msg) => {
	if (msg.type() === "error") errors.push(msg.text());
});

await page.goto(url, { waitUntil: "networkidle" });

await page.selectOption("#layout-select", layout);

const datasetButton = { sample: "#btn-sample", random: "#btn-random", ancient: "#btn-ancient" }[dataset];
await page.click(datasetButton);
await page.waitForTimeout(100);

if (precision) {
	await page.selectOption("#precision-select", precision);
	await page.waitForTimeout(100);
}

const clip = process.argv[7] ? JSON.parse(process.argv[7]) : undefined;
await page.screenshot({ path: outPath, fullPage: !clip, clip });

if (errors.length) {
	console.error("Console/page errors:", errors);
}
console.log(`Saved screenshot to ${outPath}`);

await browser.close();
