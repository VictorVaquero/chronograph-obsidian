# Chronograph

A configurable timeline graph view for [Obsidian](https://obsidian.md).

Define one or more "views," each pulling events from either a [Dataview](https://blacksmithgu.github.io/obsidian-dataview/) Query Language (DQL) source string across the vault, or a markdown table in a single note, and map fields (date, end date, title, description, group) to build an interactive timeline.

## Status

Early scaffold. The plugin loads, detects Dataview, runs configured queries, and renders a plain chronological list as a placeholder. The graphical timeline (zoom, pan, lanes/grouping, ranged events) is not implemented yet.

## Requirements

- Obsidian ≥ 1.13.0
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin installed and enabled, only for views using the Dataview source (optional at install time — Chronograph will show a notice if it's missing on a Dataview-backed view). Views using the markdown table source don't need Dataview.

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

The rendering logic (`src/timeline-renderer.ts`) is plain DOM code with no
Obsidian dependency, so it can be iterated on directly in a browser using
mock data instead of relaunching Obsidian for every change:

```bash
pnpm run dev:preview
```

This serves `src/dev/preview.html` (default: http://127.0.0.1:8000/src/dev/preview.html)
with buttons to switch between sample data, randomized data, and the
empty/error states. It rebuilds on save. This only exercises the rendering
layer — Dataview querying and the real Obsidian workspace still require
testing inside a vault.

## Project structure

```
src/
  main.ts            Plugin entry point, view registration, commands
  types.ts           Shared types (TimelineEvent, settings schema)
  settings.ts        Default settings
  settings-tab.ts     Settings UI for defining timeline views
  timeline-view.ts    ItemView wiring Obsidian lifecycle to the renderer
  timeline-renderer.ts Pure DOM rendering of TimelineEvent[] (no Obsidian dep)
  dataview-source.ts  Dataview API detection + query -> TimelineEvent mapping
  dataview-api.d.ts   Ambient types for the subset of Dataview's API used
  table-source.ts     Markdown table parsing -> TimelineEvent mapping (no Dataview dep)
  dev/                Standalone browser preview (see above), not bundled into the plugin
styles.css            Plugin styles
manifest.json         Obsidian plugin manifest
esbuild.config.mjs    Plugin build config
esbuild.preview.mjs   Standalone preview build/serve config
```

## License

MIT
