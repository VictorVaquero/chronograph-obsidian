# Chronograph

A configurable timeline graph view for [Obsidian](https://obsidian.md).

Define one or more "views," each pulling events from a [Dataview](https://blacksmithgu.github.io/obsidian-dataview/) Query Language (DQL) source string across the vault, a markdown table in a single note, or frontmatter scanned directly (no Dataview dependency), and map fields to build an interactive timeline.

## Features

- **Two layouts**: a vertical chronological list with cards alternating (or fixed) on either side of a spine, or a horizontal axis with zoom/pan.
- **Horizontal axis**: mouse-wheel/pinch zoom and drag-to-pan, grouped lanes (one row per distinct `group` value), full-height translucent period bands for eras/spans, flag markers for single significant dates, a "today" line, and BC/BCE-aware date formatting.
- **Ranged and point events**: an optional end-date field renders events as a span instead of a single marker.
- **Grouping & color**: events auto-color by group (deterministic hash), or set an explicit per-event color that overrides the group color.
- **Connecting arrows**: point one event at another (by title) to draw an arrow between them on the horizontal axis.
- **Click-to-create events**: a "+ new event" button in the horizontal toolbar prompts for a date/title and creates the event — a new table row for the table source, or a new note with frontmatter for the Dataview/frontmatter sources.
- **Native hover preview**: hovering an event's title shows Obsidian's built-in note preview popover.
- **Three event sources**: a Dataview query across the vault, a single-note markdown table, or frontmatter scanned directly via Obsidian's own metadata cache (the latter two need no Dataview dependency) — plus an "Insert timeline event row" command that scaffolds or appends rows to a table source.
- **Frontmatter source filtering**: optionally narrow the frontmatter source by tag and/or vault folder, so a single view can target e.g. all notes tagged `#event` under `Journal/`.
- **In-note code-block timelines**: a self-contained ` ```chronograph ` fenced block with an inline markdown table renders a timeline directly in Reading/Live Preview — no view configured in Settings → Chronograph required.
- **Date granularity**: from exact day up to millennium, for anything from a daily journal to ancient history.

## Requirements

- Obsidian ≥ 1.13.0
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin installed and enabled, only for views using the Dataview source (optional at install time — Chronograph will show a notice if it's missing on a Dataview-backed view). Views using the markdown table or frontmatter source don't need Dataview.

## Usage

1. Open the timeline pane via the ribbon icon ("Open Chronograph") or the **Chronograph: Open view** command.
2. In Settings → Chronograph, add a view and choose its source:
   - **Dataview query**: a DQL source string, e.g. `from "Journal" where date`.
   - **Markdown table**: the vault path of a note containing a table with a header row and a `---` divider row.
   - **Frontmatter**: scans vault notes directly via Obsidian's metadata cache, no Dataview needed. Optionally filter by tag and/or folder.
3. Map fields to columns/frontmatter keys:

   | Field | Purpose |
   | --- | --- |
   | Date | Event start date (required) |
   | End date | Renders the event as a span instead of a point |
   | Title | Falls back to the note's file name if unset |
   | Description | Shown in tooltips and vertical-layout cards |
   | Group | Buckets events into horizontal lanes and derives a color |
   | Color | Explicit CSS color, overrides the group-derived color |
   | Kind | `event` (default), `period` (background band), or `marker` (flag line) — horizontal layout only |
   | Points-to | Title of another event in the same view to draw a connecting arrow toward — horizontal layout only |

4. Pick a layout, sort order, date granularity, and (for the table source) use **Insert timeline event row** from the command palette while editing that note to scaffold/append rows.
5. On the horizontal layout, click **+ new event** in the toolbar to create an event without leaving the timeline: table-source views get a new row appended to the table note, Dataview-source views get a new note at the vault root, and frontmatter-source views get a new note in the view's folder filter (or vault root, if unset). The note's file name is the entered title, or the date if no title is given.

### In-note code blocks

For a one-off timeline without adding a view in settings, use a ` ```chronograph ` fenced code block with an inline markdown table:

    ```chronograph
    | date | title | group |
    | --- | --- | --- |
    | 2024-01-01 | Launch | Product |
    | 2024-03-15 | v2 | Product |
    ```

Column headers default to `date`, `enddate`, `title`, `description`, `group`, `color`, `kind`, `pointsto` — matching the field names in the settings-tab table above, lowercased. To override layout, precision, sort order, or field names, add a settings header above a lone `---` line before the table:

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

Recognized settings keys: `layout` (`vertical`/`horizontal`), `precision` (`day`/`month`/`year`/`decade`/`century`/`millennium`), `sort` (`asc`/`desc`), `cardside` (`alternate`/`left`/`right`), `linestyle` (`solid`/`dashed`/`dotted`), and `<field>field` for each field in the mapping table above (e.g. `titlefield`, `groupfield`). Unrecognized keys/values are ignored.

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
empty/error states. It rebuilds on save. This only exercises the rendering
layer — Dataview querying and the real Obsidian workspace still require
testing inside a vault.

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
