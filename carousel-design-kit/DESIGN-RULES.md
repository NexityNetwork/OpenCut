# Carousel design rules

These are not style suggestions. Every one of them was written after a render
was rejected for breaking it. They are ordered by how often they got broken.

---

## 1. Hard bans — a page with any of these is rejected

Nothing in this list is negotiable, on any family, ever.

- **No numbers on slides.** No "1 of 7", no step numbers, no page counts, no
  slide indices, no counters of any kind.
- **No handles, no website, no brand name, no person's name, no logo of ours.**
  Nothing that identifies who made it.
- **No arrows suggesting a swipe.** No "→", no "▶", no "swipe" note, no chevron
  at the edge of a page.
- **No uppercase labels.** Not eyebrows, not section labels, not buttons.
  Sentence case everywhere.
- **No tool or brand logos unless the subject genuinely IS named tools.** Logos
  placed for texture are the most reliable way to make a page look cheap.
- **No stock photography and no generated imagery.**
- **No fake UI chrome.** No window dots, no title bars, no terminal prompts, no
  browser frames. If a family references an interface, it references the
  *material* — not a screenshot of an OS.
- **No magenta.**
- **Banned typefaces:** Fraunces, Cormorant Garamond, Italiana, Pinyon Script,
  Caveat, Press Start 2P.

## 2. Colour

- **One or two colours per family.** A ground and an accent. A third colour has
  to earn its place and usually cannot.
- **No two families may share an accent by accident.** Near-identical accents on
  two families read as one family rendered twice. If two are close, change one
  to a different hue — not a different shade.
- **Gradients only from near neighbours.** Four stops inside a narrow range,
  never a rainbow, never a hue sweep. A gradient that crosses hues reads as a
  template, not a design.
- **Every large gradient needs grain.** An SVG `feTurbulence` layer at low
  opacity. Without it a big soft ramp bands visibly on export.
- **Flat grounds are the default.** Reach for a gradient only when the family's
  idea needs one.

## 3. Structure

- **Every family must be a different structural system.** Not a different
  colourway of the same page. Columns, ruled registers, dot matrices, tiles,
  rings, bands, shafts, folds, cut paper, contour drawing, grids, splits,
  stacks, axonometric, crop marks — pick one and commit to it.
- **Decoration never sits under type.** Shapes go to corners, to clear bands, or
  bleed off an edge. If a drawn object overlaps a text measure, either move the
  object or cap the measure so it clears.
- **Do not converge.** If a new family is starting to look like an existing one,
  the fix is a different system, not different colours.

## 4. The dead band — the single most common defect

More renders were rejected for this than for everything else combined.

**Symptom:** a hole of 300–500px in the middle of the page with nothing in it.

**Cause, almost always:** `justify-content: space-between` on a column with two
groups, plus copy shorter than the design assumed. The two groups pin to the top
and bottom and the slack collects in the middle.

**Fixes that work, in order of preference:**

1. **Make the lower region tile the frame.** `flex: 1` on the container, `flex: 1`
   on each row. Three rows then share whatever the copy leaves instead of
   stacking at the bottom.
2. **Ink one band solid.** A filled panel in the accent gives the lower half real
   mass. Three hairlines over paper is not enough weight to hold it.
3. **Set the display type larger.** Most dead bands are a headline that is too
   small for the space it was given.
4. **Add rules that articulate the space.** A ruled field is never empty; an
   unruled one is.

**Never fix it by centring everything.** That produces a page that is evenly
empty rather than locally empty.

## 5. Type

- **Line-height at display sizes.** Below about `0.98` at 72px+, Inter's
  descenders reach into the next line's ascenders and the setting reads as
  broken rather than tight. For a line that must contain full ascent + descent,
  `1.24` is the floor.
- **Cap the measure so it clears fixed elements.** If a family has a stamp, a
  badge or a plate pinned at the top right, the headline's `max-width` must stop
  short of it. Do the arithmetic once and write it in a comment.
- **Watch descendant selectors.** `.words div` matches inner divs too. Use `>`.

## 6. Content

- **Six body pages, and the sixth is the uncomfortable one.** Five useful points
  then one that undercuts them — the cost, the trade, the thing nobody wants to
  hear. A set of six equally agreeable points reads as filler.
- **Write outcomes, not tasks.** "Timeline editor working", never "Build the
  timeline editor".
- **One bolded clause per paragraph**, carrying the actual point. Not two.
- **The closing line is the single best sentence in the set.** It is usually
  reversed out of a filled field, so it gets read whether or not anything else
  does.

## 7. Testing a design

- **Render and look at it.** Every family in this kit took at least two passes.
  Not one shipped on the first render.
- **Look at the cover, one body page, and the closer.** Those are the three
  shapes. A family that works on all three works.
- **Freeze the content.** Render from the fixture, never from freshly generated
  copy. If content and design both change you cannot tell which one broke.
- **A test that cannot tell a working page from a broken one is not a test.**
  Never validate with a marker string or a stub page.

---

## Common failures and their causes

| Symptom | Cause |
|---|---|
| Hole in the middle of the page | `space-between` with two groups and short copy |
| Element escaping the 1080×1350 canvas | unbounded child, or a decorative layer with no clip |
| Chart columns at zero height | `align-items: flex-end` sizes columns to content, so `%` heights have no parent height — use `stretch` |
| Value text running off the frame | number hung off the end of a bar; give values their own column |
| Circles rendering as ellipses | SVG `viewBox` scaled inside a variable-height container — position the shapes absolutely instead |
| Grain layer covering the type | a positioned element paints above in-flow content whatever the DOM order — lift the content into the same layer |
| Two families looking like one | accents too close, or the same structure recoloured |
