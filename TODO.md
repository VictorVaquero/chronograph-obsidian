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
- [x] Vertical-layout zoom parity — a matching zoom in/out/fit toolbar
      scales the card list via CSS transform; panning stays native page
      scroll rather than a nested scroll region (`src/render/vertical-zoom-pan.ts`)
- [x] Collapse/compress sparse date ranges — the horizontal axis's
      non-linear scale now saturates gaps at 20 empty years (was 50) and
      caps them at 180px (was 260), plus a small "⌇" break marker on the
      axis wherever a gap actually got compressed, so equal-width gaps
      don't read as equal calendar time (`src/render/horizontal/scale.ts`,
      `renderCompressionMarkers` in `ticks.ts`)
- [x] Obsidian Tasks plugin emoji-date syntax — a new per-line source
      (`src/sources/tasks-source.ts`) scans checklist lines for 📅/⏳/🛫/✅
      dates, independent of the per-note frontmatter/table/Dataview
      sources; click-to-create is disabled for this source since there's
      no single note/table to target

## Feature gaps vs. competing timeline plugins

- [ ] **Export/share snapshot.** Export a timeline view as an image or
      static HTML. Not offered by any close competitor either — lower
      priority.

## Notes

- Periodic Notes, Full Calendar, and native Properties compatibility are
  intentionally *not* separate tasks — they're all satisfied by the
  frontmatter-source task above, since that reads whatever frontmatter
  shape a note already has.
