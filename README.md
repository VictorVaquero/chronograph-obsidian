# Chronograph

A configurable timeline graph view for [Obsidian](https://obsidian.md).

Define one or more "views," each pulling events from a [Dataview](https://blacksmithgu.github.io/obsidian-dataview/) Query Language (DQL) source string across the vault, a markdown table in a single note, frontmatter scanned directly (no Dataview dependency), or [Obsidian Tasks](https://publish.obsidian.md/tasks/) checklist emoji-dates, and map fields to build an interactive timeline.

Chronograph is simple by default: a new view only asks for a name, a source, and a date field. Everything else — extra field mappings, layout/style, sort order, date granularity, multiple views — already works with sensible defaults (`title`/`group`/`enddate`/... field names, vertical layout, oldest-first, day precision); the corresponding toggle in Settings → Chronograph just reveals the controls to override that default per view, so the settings tab stays uncluttered until you need to change something.

## Requirements

- Obsidian ≥ 1.13.0
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin installed and enabled, only for views using the Dataview source (optional at install time — Chronograph will show a notice if it's missing on a Dataview-backed view). Views using the markdown table or frontmatter source don't need Dataview.

## Quick start

1. Open the timeline pane via the ribbon icon ("Open Chronograph") or the **Chronograph: Open view** command.
2. In Settings → Chronograph, click **Add view**, then choose its source:
   - **Dataview query**: a DQL source string, e.g. `from "Journal" where date`.
   - **Markdown table**: the vault path of a note containing a table with a header row and a `---` divider row.
   - **Frontmatter**: scans vault notes directly via Obsidian's metadata cache, no Dataview needed. Optionally filter by tag and/or folder.
   - **Obsidian Tasks emoji-dates**: scans vault notes for checklist lines (`- [ ] ...`) carrying an [Obsidian Tasks](https://publish.obsidian.md/tasks/) emoji-date (📅 due, ⏳ scheduled, 🛫 start, ✅ done); each matching line becomes its own event, not just each note. No Dataview needed. Optionally filter by tag and/or folder.
3. Set the **Date field** — the column header (table source) or frontmatter field (Dataview/frontmatter source) holding each event's date.

That's it. The view renders as a vertical chronological list, oldest first — no other setting required. It already looks for a `title` field for the event title (falling back to the note's file name), plus `group`, `color`, `enddate`, and more (see [Extra field mappings](#extra-field-mappings) below); rename any of these in Settings → Chronograph if your notes use different field names. Zoom in/out/fit from the toolbar (or Ctrl/Cmd+wheel) any time; panning is native page scroll.

### In-note code blocks

For a one-off timeline without adding a view in settings, use a ` ```chronograph ` fenced code block with an inline markdown table:

    ```chronograph
    | date | title | group |
    | --- | --- | --- |
    | 2024-01-01 | Launch | Product |
    | 2024-03-15 | v2 | Product |
    ```

Column headers default to `date`, `title`, `group` (see [Extra field mappings](#extra-field-mappings) below for the full list). This also needs no view configured in Settings → Chronograph.

## More features

Each group below already works with the sensible default noted in its heading. The toggle in Settings → Chronograph for that group doesn't turn the feature on or off — it just reveals the controls to override the default per view, off by default so the settings tab only shows what you've chosen to customize.

### Extra field mappings

Every view already looks for the default column/frontmatter keys below, whether or not you've turned this toggle on — turning it on just shows the controls to rename them:

| Field | Default name | Purpose |
| --- | --- | --- |
| End date | `enddate` | Renders the event as a span instead of a point |
| Title | `title` | Falls back to the note's file name if unset |
| Group | `group` | Buckets events into horizontal lanes and derives a color |
| Color | `color` | Explicit CSS color, overrides the group-derived color |
| Kind | `kind` | `event` (default), `period` (background band), or `marker` (flag line) — horizontal layout only |
| Points-to | `pointsto` | Title of another event in the same view to draw a connecting arrow toward — horizontal layout only |

- **Ranged and point events**: an optional end-date field renders events as a span instead of a single marker.
- **Grouping & color**: events auto-color by group (deterministic hash), or set an explicit per-event color that overrides the group color.
- **Connecting arrows**: point one event at another (by title) to draw an arrow between them on the horizontal axis.

### Layout & style (default: vertical list)

- **Two layouts, both zoomable**: a vertical chronological list with cards alternating (or fixed) on either side of a spine, or a horizontal axis with zoom/pan.
- **Horizontal axis**: mouse-wheel/pinch zoom and drag-to-pan, grouped lanes (one row per distinct `group` value), full-height translucent period bands for eras/spans, flag markers for single significant dates, a "today" line, and BC/BCE-aware date formatting.
- **Compressed sparse ranges**: long empty gaps (century+ spans) are compressed on the horizontal axis instead of wasting track width, with a small "⌇" break marker showing where compression happened.
- **Vertical layout options**: which side of the spine cards sit on (alternating, left, or right), and the spine's line style (solid, dashed, dotted).

### Sort & date granularity (default: oldest first, day precision)

- **Sort order**: oldest or newest first.
- **Date granularity**: from exact day up to millennium, for anything from a daily journal to ancient history. This is usually a per-view choice rather than a vault-wide one — a "life events" view showing decades/centuries and a daily journal view showing exact days can coexist as two separate views, each with its own granularity.

### Multiple views

- Add as many views as you like, each with its own source and settings.
- Once you have more than one, mark one as the **default view** to open it automatically when the timeline pane is created.

### Always available

These aren't behind a toggle — they work regardless of which advanced groups are on:

- **Click-to-create events**: a "+ new event" button in the horizontal toolbar prompts for a date/title and creates the event — a new table row for the table source, or a new note with frontmatter for the Dataview/frontmatter sources.
- **Export snapshot**: an "Export snapshot" button (vertical and horizontal toolbars) saves the current timeline as an SVG image file into your vault. Embed it anywhere with `![[Name snapshot.svg]]` — it renders directly as an image both in Obsidian and on GitHub, no extra software needed.
- **Native hover preview**: hovering an event's title shows Obsidian's built-in note preview popover.
- **Four event sources**: a Dataview query across the vault, a single-note markdown table, frontmatter scanned directly via Obsidian's own metadata cache, or Obsidian Tasks checklist emoji-dates (the latter two need no Dataview dependency) — plus an "Insert timeline event row" command that scaffolds or appends rows to a table source.
- **Frontmatter/Tasks source filtering**: narrow the frontmatter or Tasks source by tag and/or vault folder, so a single view can target e.g. all notes tagged `#event` under `Journal/`.
- **In-note code-block timelines**: see [In-note code blocks](#in-note-code-blocks) above.

## Advanced: in-note code block settings

The ` ```chronograph ` code block accepts the same options as a configured view. Add a settings header above a lone `---` line before the table:

    ```chronograph
    layout: horizontal
    precision: year
    sort: desc
    datefield: when
    ---
    | when | title |
    | --- | --- |
    | 1969 | Moon landing |
    ```

Recognized settings keys: `layout` (`vertical`/`horizontal`), `precision` (`day`/`month`/`year`/`decade`/`century`/`millennium`), `sort` (`asc`/`desc`), `cardside` (`alternate`/`left`/`right`), `linestyle` (`solid`/`dashed`/`dotted`), and `<field>field` for each field in the [extra field mappings](#extra-field-mappings) table (e.g. `titlefield`, `groupfield`), plus `descriptionfield` for the description shown in tooltips and vertical-layout cards. Unrecognized keys/values are ignored.

## Contributing

Want to build Chronograph from source, run it in dev mode, or find your way around the codebase? See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
