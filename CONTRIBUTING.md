# Contributing to Chronograph

This document covers building, testing, and the codebase layout. For what the
plugin does and how to use it, see [README.md](README.md).

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

This serves `src/dev/preview.html` (default: http://127.0.0.1:8000/src/dev/preview.html),
a mock of the Obsidian window (title bar, ribbon, tab, and a settings modal
mirroring `settings-tab.ts`'s advanced toggles) around the real timeline
renderer. Below the toolbar, three tabs simulate editing a view's source
live, the same way you'd edit it for real:

- **Markdown table**: an editable table in a mock note, parsed on every
  keystroke with the same logic as `table-source.ts`.
- **Dataview query**: a query-style text field backed by a handful of canned
  DQL strings (see the preset buttons) that swap in preset result sets —
  real Dataview isn't running here, so anything else shows an error.
- **Frontmatter scan**: tag/folder filters applied live against a small mock
  vault, mirroring `frontmatter-source.ts`.

Buttons for sample/randomized/ancient/empty/error data remain for quickly
exercising states outside any single source. It rebuilds on save. This only
exercises the rendering + settings-shape layer — real Dataview querying, the
Tasks source, and the real Obsidian workspace still require testing inside a
vault.

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
    tasks-source.ts        Per-line Obsidian Tasks emoji-date scan (tag/folder filters) -> TimelineEvent mapping
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
    preview.ts/.html        Entry point + Obsidian-chrome mock, settings modal, source tabs
    mock-table-parser.ts    Reimplements table-source.ts's pure parsing for the table tab
    mock-dataview.ts        Canned query -> preset event-set lookup for the Dataview tab
    mock-frontmatter.ts     Reimplements frontmatter-source.ts's mapping over a mock vault
    mock-events.ts          Hand-authored sample/ancient/randomized event sets
  test-utils/             Minimal "obsidian" package mock for Vitest
styles.css                Plugin styles
manifest.json              Obsidian plugin manifest
esbuild.config.mjs          Plugin build config
esbuild.preview.mjs         Standalone preview build/serve config
e2e/                        Playwright end-to-end/visual tests
```
