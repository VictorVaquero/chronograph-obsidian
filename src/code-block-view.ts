import { HoverParent, HoverPopover, MarkdownPostProcessorContext } from "obsidian";
import { parseCodeBlock, TimelineCodeBlockParseError } from "./sources/code-block-source";
import { renderErrorState, renderTimeline } from "./render/timeline-renderer";
import { compareTimelineDates } from "./date/timeline-date";
import type TimelineGraphPlugin from "./main";

/**
 * Registers the `chronograph` fenced-code-block processor: renders an
 * inline, self-contained timeline from a markdown table embedded directly
 * in the block, with an optional settings header, no view configured in
 * Settings → Chronograph required.
 */
export function registerCodeBlockProcessor(plugin: TimelineGraphPlugin): void {
	plugin.registerMarkdownCodeBlockProcessor("chronograph", (source, el, ctx) => {
		renderCodeBlock(plugin, source, el, ctx);
	});
}

function renderCodeBlock(
	plugin: TimelineGraphPlugin,
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
): void {
	el.addClass("timeline-graph-view", "timeline-graph-code-block");

	// A plain HoverParent stand-in — the code block has no ItemView of its
	// own to own the popover, so this object's mutable hoverPopover field is
	// all Obsidian's hover-link machinery actually needs.
	const hoverParent: HoverParent = { hoverPopover: null as HoverPopover | null };

	try {
		const { config, events } = parseCodeBlock(source, ctx.sourcePath);
		events.sort((a, b) =>
			config.sortOrder === "asc"
				? compareTimelineDates(a.date, b.date)
				: compareTimelineDates(b.date, a.date)
		);
		renderTimeline(
			el,
			events,
			config.layout,
			{
				onEventClick: (event) => {
					void plugin.app.workspace.openLinkText(event.sourcePath, ctx.sourcePath, false);
				},
				onEventHover: (event, evt, targetEl) => {
					plugin.app.workspace.trigger("hover-link", {
						event: evt,
						source: "chronograph",
						hoverParent,
						targetEl,
						linktext: event.sourcePath,
						sourcePath: ctx.sourcePath,
					});
				},
			},
			{
				precision: config.precision,
				verticalCardSide: config.verticalCardSide,
				verticalLineStyle: config.verticalLineStyle,
			}
		);
	} catch (err) {
		renderErrorState(
			el,
			err instanceof TimelineCodeBlockParseError || err instanceof Error
				? err.message
				: String(err)
		);
	}
}
