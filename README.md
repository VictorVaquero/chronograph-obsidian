# Timeline Graph

A configurable timeline graph view for [Obsidian](https://obsidian.md), using [Dataview](https://blacksmithgu.github.io/obsidian-dataview/) as its query backend.

Define one or more "views," each backed by a Dataview Query Language (DQL) source string, and map note fields (date, end date, title, description, group) to build an interactive timeline from your vault.

## Status

Early scaffold. The plugin loads, detects Dataview, runs configured queries, and renders a plain chronological list as a placeholder. The graphical timeline (zoom, pan, lanes/grouping, ranged events) is not implemented yet.

## Requirements

- Obsidian ≥ 1.5.0
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin installed and enabled (optional at install time, but required for the timeline to populate — Timeline Graph will show a notice if it's missing)

## Development

```bash
pnpm install
pnpm run dev    # watch mode, rebuilds main.js on change
pnpm run build  # type-check + production build
```

To test in a vault, symlink or copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/timeline-graph/`.

## Project structure

```
src/
  main.ts            Plugin entry point, view registration, commands
  types.ts           Shared types (TimelineEvent, settings schema)
  settings.ts        Default settings
  settings-tab.ts     Settings UI for defining timeline views
  timeline-view.ts    ItemView rendering the timeline pane
  dataview-source.ts  Dataview API detection + query -> TimelineEvent mapping
  dataview-api.d.ts   Ambient types for the subset of Dataview's API used
styles.css            Plugin styles
manifest.json         Obsidian plugin manifest
esbuild.config.mjs    Build config
```

## License

MIT
