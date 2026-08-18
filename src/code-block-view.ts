import { HoverParent, HoverPopover, MarkdownPostProcessorContext, MarkdownRenderChild } from "obsidian";
import { parseCodeBlockConfig, TimelineCodeBlockConfig, TimelineCodeBlockParseError } from "./sources/code-block-source";
import { parseTimelineEventsFromTableContent, queryTimelineEventsFromTable } from "./sources/table-source";
import { queryTimelineEventsFromFrontmatter } from "./sources/frontmatter-source";
import { queryTimelineEventsFromTasks } from "./sources/tasks-source";
import {
	DataviewUnavailableError,
	isDataviewEnabled,
	onDataviewRefresh,
	queryTimelineEvents,
} from "./sources/dataview-source";
import { TimelineEvent } from "./types";
import { renderErrorState, renderTimeline } from "./render/timeline-renderer";
import { compareTimelineDates } from "./date/timeline-date";
import type TimelineGraphPlugin from "./main";
import { log } from "./log";

/**
 * Registers the `chronograph` fenced-code-block processor: renders an
 * inline, self-contained timeline from a settings header plus a source —
 * by default an inline markdown table embedded directly in the block, but
 * (like a configured view) also a Dataview query, frontmatter scan, or
 * Obsidian Tasks scan — no view configured in Settings → Chronograph
 * required.
 */
export function registerCodeBlockProcessor(plugin: TimelineGraphPlugin): void {
	plugin.registerMarkdownCodeBlockProcessor("chronograph", (source, el, ctx) => {
		void renderCodeBlock(plugin, source, el, ctx);

		// Dataview finishes indexing the vault asynchronously after Obsidian
		// starts, well after code blocks first render — a block that queries
		// Dataview before that completes would otherwise resolve zero events
		// and never update. Dataview's own built-in query views re-render on
		// this same "dataview:refresh-views" workspace event (fired once the
		// index is ready, and again after every subsequent metadata change),
		// so listening for it here keeps a dataview-source block in sync the
		// same way. Harmless to register for every source type: other sources
		// just never see it refire, or refire cheaply if they do.
		const child = new MarkdownRenderChild(el);
		child.registerEvent(
			onDataviewRefresh(plugin.app, () => {
				void renderCodeBlock(plugin, source, el, ctx);
			})
		);
		ctx.addChild(child);
	});
}

async function resolveCodeBlockEvents(
	plugin: TimelineGraphPlugin,
	config: TimelineCodeBlockConfig,
	body: string,
	sourcePath: string
): Promise<TimelineEvent[]> {
	if (config.sourceType === "dataview") {
		if (!isDataviewEnabled(plugin.app)) {
			log.warn("Code block uses Dataview source but Dataview is unavailable", { sourcePath });
			throw new DataviewUnavailableError();
		}
		return queryTimelineEvents(plugin.app, config.dataviewQuery, config.fields);
	}

	if (config.sourceType === "frontmatter") {
		return queryTimelineEventsFromFrontmatter(
			plugin.app,
			config.frontmatterTag,
			config.frontmatterFolder,
			config.fields
		);
	}

	if (config.sourceType === "tasks") {
		return queryTimelineEventsFromTasks(plugin.app, config.frontmatterTag, config.frontmatterFolder);
	}

	// "table": an explicit `path` reads that note's table, like a configured
	// view; with no `path`, the block's own body is the inline table.
	if (config.tableNotePath) {
		return queryTimelineEventsFromTable(plugin.app, config.tableNotePath, config.fields);
	}

	const events = parseTimelineEventsFromTableContent(body, sourcePath, config.fields);
	if (!events) {
		log.warn("No markdown table found in code block", { sourcePath });
		throw new TimelineCodeBlockParseError(
			'No markdown table found in this chronograph block. Add a table with a header row and a "---" divider row, or set a `source`/`path`.'
		);
	}
	return events;
}

async function renderCodeBlock(
	plugin: TimelineGraphPlugin,
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
): Promise<void> {
	el.addClass("timeline-graph-view", "timeline-graph-code-block");

	// A plain HoverParent stand-in — the code block has no ItemView of its
	// own to own the popover, so this object's mutable hoverPopover field is
	// all Obsidian's hover-link machinery actually needs.
	const hoverParent: HoverParent = { hoverPopover: null as HoverPopover | null };

	try {
		const { config, body } = parseCodeBlockConfig(source);
		log.debug("Rendering code block", { sourcePath: ctx.sourcePath, sourceType: config.sourceType });
		const events = await resolveCodeBlockEvents(plugin, config, body, ctx.sourcePath);
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
				// Style presets (density/cardRadius/markerSize/spineThickness/
				// shadowIntensity) are deliberately not threaded here — code
				// blocks have no per-view config to hold them and always render
				// at the defaults, same as Phase 1's palette/shadow fixes apply
				// unconditionally. A power user can still reach for a CSS snippet.
				precision: config.precision,
				verticalCardSide: config.verticalCardSide,
				verticalLineStyle: config.verticalLineStyle,
			}
		);
	} catch (err) {
		log.error("Failed to render code block", { sourcePath: ctx.sourcePath }, err);
		renderErrorState(
			el,
			err instanceof TimelineCodeBlockParseError || err instanceof Error
				? err.message
				: String(err)
		);
	}
}
