import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });
await page.goto("http://127.0.0.1:8000/src/dev/preview.html", { waitUntil: "networkidle" });
await page.selectOption("#layout-select", "vertical");
await page.click("#btn-sample");
await page.waitForTimeout(200);

const info = await page.evaluate(() => {
	const nodes = Array.from(document.querySelectorAll(".timeline-graph-node"));
	const spine = document.querySelector(".timeline-graph-spine-line");
	const spineRect = spine.getBoundingClientRect();
	const spineContainer = document.querySelector(".timeline-graph-spine");
	const spineContainerRect = spineContainer.getBoundingClientRect();
	const app = document.getElementById("app");
	const appRect = app.getBoundingClientRect();
	return {
		appWidth: appRect.width,
		appLeft: appRect.left,
		spineContainerWidth: spineContainerRect.width,
		spineContainerLeft: spineContainerRect.left,
		spineContainerBoxSizing: getComputedStyle(spineContainer).boxSizing,
		spineLeft: spineRect.left,
		spineCenter: spineRect.left + spineRect.width / 2,
		nodes: nodes.map((n) => {
			const rect = n.getBoundingClientRect();
			const card = n.querySelector(".timeline-graph-card");
			const cardRect = card.getBoundingClientRect();
			const dot = n.querySelector(".timeline-graph-node-dot");
			const dotRect = dot.getBoundingClientRect();
			const cs = getComputedStyle(n);
			return {
				className: n.className,
				justifyContent: cs.justifyContent,
				paddingLeft: cs.paddingLeft,
				paddingRight: cs.paddingRight,
				nodeLeft: rect.left,
				nodeWidth: rect.width,
				cardLeft: cardRect.left,
				cardWidth: cardRect.width,
				dotCenterX: dotRect.left + dotRect.width / 2,
			};
		}),
	};
});
console.log(JSON.stringify(info, null, 2));

const firstCard = await page.$(".timeline-graph-card");
const before = await firstCard.evaluate((el) => {
	const cs = getComputedStyle(el, "::before");
	return {
		content: cs.content,
		width: cs.width,
		height: cs.height,
		background: cs.backgroundColor,
		right: cs.right,
		left: cs.left,
		position: cs.position,
		display: cs.display,
	};
});
console.log("::before computed:", JSON.stringify(before, null, 2));

await browser.close();
