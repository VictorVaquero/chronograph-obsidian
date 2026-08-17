# Chronograph

A configurable timeline graph view for [Obsidian](https://obsidian.md).

Define one or more "views," each pulling events from a [Dataview](https://blacksmithgu.github.io/obsidian-dataview/) Query Language (DQL) source string across the vault, a markdown table in a single note, or frontmatter scanned directly (no Dataview dependency), and map fields to build an interactive timeline.

Chronograph is simple by default: a new view only asks for a name, a source, and a date field. Everything else — extra field mappings, layout/style, sort order, date granularity, multiple views — is opt-in, off until you turn it on in Settings → Chronograph.

## Requirements

- Obsidian ≥ 1.13.0
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin installed and enabled, only for views using the Dataview source (optional at install time — Chronograph will show a notice if it's missing on a Dataview-backed view). Views using the markdown table or frontmatter source don't need Dataview.

## Quick start

1. Open the timeline pane via the ribbon icon ("Open Chronograph") or the **Chronograph: Open view** command.
2. In Settings → Chronograph, click **Add view**, then choose its source:
   - **Dataview query**: a DQL source string, e.g. `from "Journal" where date`.
   - **Markdown table**: the vault path of a note containing a table with a header row and a `---` divider row.
   - **Frontmatter**: scans vault notes directly via Obsidian's metadata cache, no Dataview needed. Optionally filter by tag and/or folder.
3. Set the **Date field** — the column header (table source) or frontmatter field (Dataview/frontmatter source) holding each event's date.

That's it. The view renders as a vertical chronological list, oldest first, using each note's file name as the event title — no other setting required. Zoom in/out/fit from the toolbar (or Ctrl/Cmd+wheel) any time; panning is native page scroll.

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

Each group below is a toggle in Settings → Chronograph, off by default so the settings tab only shows what you've turned on.

### Extra field mappings

Map additional columns/frontmatter keys beyond the date field:

| Field | Purpose |
| --- | --- |
| End date | Renders the event as a span instead of a point |
| Title | Falls back to the note's file name if unset |
| Group | Buckets events into horizontal lanes and derives a color |
| Color | Explicit CSS color, overrides the group-derived color |
| Kind | `event` (default), `period` (background band), or `marker` (flag line) — horizontal layout only |
| Points-to | Title of another event in the same view to draw a connecting arrow toward — horizontal layout only |

- **Ranged and point events**: an optional end-date field renders events as a span instead of a single marker.
- **Grouping & color**: events auto-color by group (deterministic hash), or set an explicit per-event color that overrides the group color.
- **Connecting arrows**: point one event at another (by title) to draw an arrow between them on the horizontal axis.

### Layout & style

- **Two layouts, both zoomable**: a vertical chronological list with cards alternating (or fixed) on either side of a spine, or a horizontal axis with zoom/pan.
- **Horizontal axis**: mouse-wheel/pinch zoom and drag-to-pan, grouped lanes (one row per distinct `group` value), full-height translucent period bands for eras/spans, flag markers for single significant dates, a "today" line, and BC/BCE-aware date formatting.
- **Compressed sparse ranges**: long empty gaps (century+ spans) are compressed on the horizontal axis instead of wasting track width, with a small "⌇" break marker showing where compression happened.
- **Vertical layout options**: which side of the spine cards sit on (alternating, left, or right), and the spine's line style (solid, dashed, dotted).

### Sort & date granularity

- **Sort order**: oldest or newest first.
- **Date granularity**: from exact day up to millennium, for anything from a daily journal to ancient history.

### Multiple views

- Add as many views as you like, each with its own source and settings.
- Once you have more than one, mark one as the **default view** to open it automatically when the timeline pane is created.

### Always available

These aren't behind a toggle — they work regardless of which advanced groups are on:

- **Click-to-create events**: a "+ new event" button in the horizontal toolbar prompts for a date/title and creates the event — a new table row for the table source, or a new note with frontmatter for the Dataview/frontmatter sources.
- **Native hover preview**: hovering an event's title shows Obsidian's built-in note preview popover.
- **Three event sources**: a Dataview query across the vault, a single-note markdown table, or frontmatter scanned directly via Obsidian's own metadata cache (the latter two need no Dataview dependency) — plus an "Insert timeline event row" command that scaffolds or appends rows to a table source.
- **Frontmatter source filtering**: narrow the frontmatter source by tag and/or vault folder, so a single view can target e.g. all notes tagged `#event` under `Journal/`.
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

## Development

```bash
pnpm install
pnpm run dev    # watch mode, rebuilds main.js on change
pnpm run build  # type-check + production build
```

To test in a vault, set `OBSIDIAN_VAULT` to the vault's root directory and every build (`dev` or `build`) copies `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/chronograph/` automatically:

```bash
OBSIDIAN_VAULT=/path/to/your/vault pnpm run dev
```

Reload Obsidian (`Ctrl+R`/`Cmd+R` in the developer console, or via the community [Hot-Reload](https://github.com/pjeby/hot-reload) plugin) to pick up changes without a manual copy step.

### Previewing the timeline UI without Obsidian

The rendering logic (`src/render/`) is plain DOM code with no Obsidian dependency, so it can be iterated on directly in a browser using mock data instead of relaunching Obsidian for every change:

```bash
pnpm run dev:preview
```

This serves `src/dev/preview.html` (default: http://127.0.0.1:8000/src/dev/preview.html)
with buttons to switch between sample data, randomized data, and the
empty/error states, plus an "Advanced" checkbox that mirrors the settings
tab's layout/style/granularity toggles. It rebuilds on save. This only
exercises the rendering layer — Dataview querying and the real Obsidian
workspace still require testing inside a vault.

### Tests

```bash
pnpm run lint       # eslint
pnpm run typecheck  # tsc -noEmit
pnpm run test       # vitest unit tests
pnpm run test:e2e   # playwright end-to-end/visual tests
pnpm run review     # lint + typecheck + test + build, runs automatically pre-commit
```

## Project structure

```
src/
  main.ts               Plugin entry point, view/command registration
  types.ts               Shared types (TimelineEvent, field mapping, settings schema)
  settings.ts             Default settings
  settings-tab.ts          Settings UI for defining timeline views
  commands.ts              "Insert timeline event row" editor command
  event-creation.ts        Click-to-create: writes a new table row or note for a view's source
  create-event-modal.ts    Date/title prompt for click-to-create
  timeline-view.ts         ItemView wiring Obsidian lifecycle (incl. hover preview) to the renderer
  code-block-view.ts       `chronograph` fenced-code-block processor, renders inline in notes
  date/
    timeline-date.ts       Signed-year date model (BC/BCE support), parsing, formatting
  sources/
    dataview-source.ts     Dataview API detection + query -> TimelineEvent mapping
    dataview-api.d.ts      Ambient types for the subset of Dataview's API used
    table-source.ts        Markdown table parsing -> TimelineEvent mapping (no Dataview dep)
    frontmatter-source.ts  Metadata-cache scan (tag/folder filters) -> TimelineEvent mapping (no Dataview dep)
    code-block-source.ts   Code-block settings header + inline table -> config/TimelineEvent mapping
  render/
    timeline-renderer.ts   Dispatches to the vertical/horizontal renderer (no Obsidian dep)
    render-shared.ts       Shared render helpers: colors, hover preview, empty/error states
    render-vertical.ts     Vertical card-list layout
    vertical-zoom-pan.ts   Transform-scale zoom for the vertical layout
    horizontal/
      index.ts             Horizontal axis orchestration
      scale.ts              Date <-> percentage-position scale
      ticks.ts               Axis ticks/labels, period lines
      zoom-pan.ts             Wheel/pinch zoom and drag-to-pan
      markers.ts              Lanes, point/range markers, period bands, flag markers, tooltips
      arrows.ts                SVG arrow overlay connecting events via the "points-to" field
  dev/                    Standalone browser preview (see above), not bundled into the plugin
  test-utils/             Minimal "obsidian" package mock for Vitest
styles.css                Plugin styles
manifest.json              Obsidian plugin manifest
esbuild.config.mjs          Plugin build config
esbuild.preview.mjs         Standalone preview build/serve config
e2e/                        Playwright end-to-end/visual tests
```

## License

MIT
