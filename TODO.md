# Chronograph task list

Gaps identified by comparing Chronograph against popular Obsidian timeline
plugins (Timelines Revamped, Chronos Timeline, Release Timeline, Timeline
View) and against common companion plugins in the ecosystem.

## Done

- [x] Rewrite README to reflect current feature set (`f2760a1`)
- [x] Connecting arrows between events via `pointsTo` (`4d80db2`)

## Feature gaps vs. competing timeline plugins

- [ ] **Frontmatter/tag-based event source, no Dataview dependency.**
      Read dates/title/group directly from a note's frontmatter (or a tag)
      via Obsidian's own metadata cache. This is the biggest adoption
      blocker today — both current sources require either installing
      Dataview or hand-maintaining a table. It's also the pattern every
      close competitor (Timelines Revamped, obsidian-timelines) supports,
      and it incidentally covers reading the same frontmatter shapes used
      by Periodic Notes and the Full Calendar plugin, so no separate work
      is needed for those.
- [ ] **In-note code-block rendering.** Render a timeline inline in
      Reading/Live Preview from a fenced code block (e.g. ` ```chronograph `),
      not only from a dedicated view configured in settings. Chronos
      Timeline's main draw is exactly this zero-config, per-note usage.
- [ ] **Click-to-create note from timeline.** Clicking an empty spot on the
      axis creates a new note with the date field pre-filled. Consider
      using a Templater template for the new note if Templater is
      installed, matching how vaults already create dated notes.
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
