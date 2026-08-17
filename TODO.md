# Chronograph task list

Gaps identified by comparing Chronograph against popular Obsidian timeline
plugins (Timelines Revamped, Chronos Timeline, Release Timeline, Timeline
View) and against common companion plugins in the ecosystem.

## Done

- [x] Rewrite README to reflect current feature set (`f2760a1`)
- [x] Connecting arrows between events via `pointsTo` (`4d80db2`)
- [x] Frontmatter/tag-based event source, no Dataview dependency
      (`src/sources/frontmatter-source.ts`, tag + folder filters)
- [x] In-note code-block rendering — a self-contained ` ```chronograph `
      fenced block with an inline table and optional settings header
      (`src/sources/code-block-source.ts`, `src/code-block-view.ts`)
- [x] Click-to-create note from timeline — a "+ new event" button in the
      horizontal toolbar opens a date/title prompt; creates a table row
      (table source) or a new note with frontmatter (Dataview/frontmatter
      sources) (`src/event-creation.ts`, `src/create-event-modal.ts`)

## Feature gaps vs. competing timeline plugins

- [ ] **Vertical-layout zoom/pan parity.** Only the horizontal layout has
      zoom/pan today; vertical is the default layout and lacks it.
- [ ] **Collapse/compress sparse date ranges.** For long timelines (century+
      spans), visually compress long gaps of empty time instead of wasting
      axis space on them.
- [ ] **Export/share snapshot.** Export a timeline view as an image or
      static HTML. Not offered by any close competitor either — lower
      priority.

## Compatibility with other plugins

- [ ] **Obsidian Tasks plugin emoji-date syntax** (e.g. `📅 2024-01-01`,
      `🛫`, `✅`). Needs its own per-line task parser — a different code
      path from the frontmatter/table/Dataview sources, which are all
      per-note. Lower priority; only needed if users want task due-dates
      on the timeline without going through Dataview (which already
      exposes Tasks' emoji-dates as queryable fields).

## Notes

- Periodic Notes, Full Calendar, and native Properties compatibility are
  intentionally *not* separate tasks — they're all satisfied by the
  frontmatter-source task above, since that reads whatever frontmatter
  shape a note already has.
