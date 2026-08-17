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
- [x] Fix: century/decade/millennium precision showed a rounded/roman-numeral
      bucket label ("XX", "1980") on individual event cards instead of the
      exact year; now shows the full year (e.g. "1983") at every precision.
      Divider bucket labels (`bucketOf`) are unaffected (`src/date/timeline-date.ts`)
- [x] Split developer docs out of README into `CONTRIBUTING.md` (build/dev
      workflow, preview harness, tests, project structure) so README stays
      a non-technical, user-facing overview
- [x] Export/share snapshot — an "Export snapshot" toolbar button (vertical
      and horizontal layouts) saves the timeline as a self-contained SVG
      file into the vault. SVG was chosen specifically because it renders
      natively as an image both on GitHub and inside Obsidian embeds
      (`![[Name snapshot.svg]]`), with no new dependency or JS execution
      required (`src/export/svg-export.ts`, `src/export-snapshot.ts`)

- [x] Screenshots in README — vertical layout, horizontal layout, and a
      BC/AD period-band example, reusing the e2e visual-regression suite's
      reference PNGs so they stay current with the renderer automatically
      (`docs/images/`)
- [x] Project logo/wordmark for README — a simple SVG mark (spine + colored
      event dots, echoing the plugin's own per-group hue palette) plus
      wordmark, shown at the top of README (`docs/images/logo.svg`)

## Known issues

- [ ] **`pnpm run test:e2e` is broken (16/18 failing).** `e2e/visual.spec.ts`,
      `rendering.spec.ts`, and `click-priority.spec.ts` reference
      `#layout-select`, `#card-side-select`, `#line-style-select` in
      `src/dev/preview.html`, which no longer exist after the dev-preview
      harness was rewritten around a settings-modal UI (dropdowns now live
      inside dynamically rendered `.setting-item`s with no stable IDs, see
      `renderSettings()` in `src/dev/preview.ts`). The e2e specs need their
      selectors updated to match (e.g. open `#open-settings` first, then
      locate controls by their `.setting-item-name` text). Until fixed, the
      `e2e/visual.spec.ts-snapshots/*.png` reference images can't be
      regenerated or verified against the current harness, though the
      existing PNGs (used in README screenshots) are still visually
      accurate as of `a4b8990`.

## Notes

- Periodic Notes, Full Calendar, and native Properties compatibility are
  intentionally *not* separate tasks — they're all satisfied by the
  frontmatter-source task above, since that reads whatever frontmatter
  shape a note already has.
