import { TimelineDatePrecision, TimelineEvent, TimelineSortOrder } from "../types";
import { compareTimelineDates, formatTimelineDateRange, hasAnyBCDate } from "../date/timeline-date";
import { TimelineTheme, buildGroupColorMap, colorForEvent, groupsOf } from "../render/render-shared";

const ROW_HEIGHT = 56;
const PADDING = 24;
const DOT_X = PADDING + 6;
const DATE_X = DOT_X + 20;
const DATE_WIDTH = 140;
const TITLE_X = DATE_X + DATE_WIDTH;
const MAX_WIDTH = 900;
const MAX_TITLE_CHARS = 90;

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function truncate(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/**
 * Renders a static, self-contained SVG snapshot of a timeline's events as a
 * simple chronological list (independent of the interactive vertical/
 * horizontal layouts, which rely on CSS/zoom/pan that wouldn't survive
 * outside the plugin). All styling is inlined so the file renders correctly
 * wherever SVG is supported natively, e.g. embedded in a GitHub README or
 * an Obsidian note, with no script and no external stylesheet.
 */
export function exportTimelineSvg(
	events: TimelineEvent[],
	precision: TimelineDatePrecision,
	sortOrder: TimelineSortOrder,
	title?: string,
	theme: TimelineTheme = "light"
): string {
	const sorted = [...events].sort((a, b) =>
		sortOrder === "asc" ? compareTimelineDates(a.date, b.date) : compareTimelineDates(b.date, a.date)
	);

	const groupColors = buildGroupColorMap(groupsOf(sorted), theme);
	const showEra = hasAnyBCDate(sorted.flatMap((e) => (e.endDate ? [e.date, e.endDate] : [e.date])));

	const headerHeight = title ? ROW_HEIGHT : 0;
	const height = PADDING * 2 + headerHeight + sorted.length * ROW_HEIGHT;
	const width = MAX_WIDTH;

	const rows = sorted
		.map((event, index) => {
			const y = PADDING + headerHeight + index * ROW_HEIGHT;
			const centerY = y + ROW_HEIGHT / 2;
			const color = colorForEvent(event, groupColors) ?? "#888888";
			const dateText = escapeXml(formatTimelineDateRange(event.date, event.endDate, precision, showEra));
			const titleText = escapeXml(truncate(event.title, MAX_TITLE_CHARS));

			const connector =
				index < sorted.length - 1
					? `<line x1="${DOT_X}" y1="${centerY}" x2="${DOT_X}" y2="${centerY + ROW_HEIGHT}" stroke="#888888" stroke-width="1.5" />`
					: "";

			return [
				connector,
				`<circle cx="${DOT_X}" cy="${centerY}" r="5" fill="${color}" />`,
				`<text x="${DATE_X}" y="${centerY}" dominant-baseline="middle" font-family="sans-serif" font-size="13" fill="#888888">${dateText}</text>`,
				`<text x="${TITLE_X}" y="${centerY}" dominant-baseline="middle" font-family="sans-serif" font-size="14" fill="#1a1a1a" font-weight="600">${titleText}</text>`,
			].join("");
		})
		.join("\n");

	const header = title
		? `<text x="${PADDING}" y="${PADDING + headerHeight / 2}" dominant-baseline="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="#1a1a1a">${escapeXml(title)}</text>`
		: "";

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
${header}
${rows}
</svg>
`;
}
