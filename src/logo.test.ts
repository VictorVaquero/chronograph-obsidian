import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

describe("docs/images/logo.svg", () => {
	const here = dirname(fileURLToPath(import.meta.url));
	const svg = readFileSync(join(here, "..", "docs", "images", "logo.svg"), "utf-8");

	it("is valid, parseable XML", () => {
		const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
		expect(doc.querySelector("parsererror")).toBeNull();
	});

	it("has a title for accessibility", () => {
		expect(svg).toContain("<title>Chronograph</title>");
	});
});
