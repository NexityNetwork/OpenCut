# content-tools

Generators for the reel/overlay artwork, kept in the repo because the container
they run in is ephemeral and has already been wiped mid-session once.

| File | What it does |
|---|---|
| `refbreak.py` | Breaks a reference video down: drop, beat grid, shot list, and whether its cuts actually land on the grid |
| `extract-inset.py` | Pulls the workflow screenshot out of a reference at native resolution, from its sharpest frame |
| `state-overlay.py` | The big-type format: one continuous B-roll, a sequence of overlay states, no cuts |
| `stack-note.py` | The format that actually gets traction. Two app tiles, a plus, and four typed lines on bare footage |
| `danger-zones.py` | Overlays what each surface eats (feed crop, grid crop, reel UI) on a finished frame, so "will this get clipped" is answered by looking rather than by arguing |
| `slide-agent.py` | The named-agent carousel: centred, light canvas, blurb, tool row, comment pill |
| `slide-pair.py` | The wrong-vs-right carousel: numbered, dark canvas, the cost then the answer |
| `slide-body.py` | The n8n reel: five body frames plus a closer, title, three bolded clauses, the workflow on a plate, the tools that are actually in it |
| `which-tool-card.py` | Renders the OLD vs NEW comparison card in both themes: `light` on a paper surface, `dark` as a transparent overlay for video |
| `push-vault.py` | Uploads finished assets to `ultron-reels/imports/` and inserts the `vault_items` row, with the caption rules enforced before anything is written |
| `wordmark_paths.json` | The traced ultron wordmark outlines (`w`, `asc`, `paths[].d`), also the source for `apps/web/src/brand/ultron-wordmark.ts` |

## Breaking down a reference

```sh
python3 refbreak.py REF.mp4 [MORE.mp4 ...] --json out.json --sheet shots.png
```

The rules that cost the most to learn, all encoded in the script:

- **Find the drop, not the first beat.** librosa's `beat_track` returned 1.78s on
  a reference whose drop was at 4.13s, because it locked onto the first beat of a
  quiet intro. The detector here is energy based and tests the **10th percentile
  floor** over a window rather than the mean. A drop is not "it gets loud", it is
  "the quiet parts stop being quiet". A mean-based test gets fooled by one loud
  isolated kick in the intro and fires at 0.00s; that happened, and the real
  answer was 4.57s.
- **Sync on the drop, not the fitted phase.** Phase can sit up to 0.3s after the
  drop. Anchoring on it cost 185ms of drift. Rule:
  `sync = drop if drop >= hook_duration else first grid point past the hook`, and
  trim the audio intro with `astart = max(0, drop - hook_duration)`.
- **A grid score needs contrast, not just magnitude.** The raw mean of the onset
  envelope at the grid points is fooled by a flat envelope; ambient room noise
  scores higher than real music because music's mean is low and only its hits are
  high. Both tests: score >= 0.45 and contrast >= 1.25x.
- **A cut is a spike, not a threshold crossing.** Handheld camera motion clears
  any fixed threshold. A cut has to be a local maximum AND stand 2.5x over the
  second either side of it.
- **The hook segment gets reused, the hook content gets replaced.** Keeping the
  reference's opening frames means shipping their hook, which has happened once.

Thresholds are provisional until they have been run against real references with
real tracks. Raw phone clips have no correct answer in them to calibrate against.

## Extracting a reference's screenshot

```sh
python3 extract-inset.py refs/*.mp4          # -> refs/workflows/<name>_workflow.png
```

The screenshot is the substance of these videos - the text is a caption for it -
so it comes out at native resolution from the sharpest frame available. A phone
filming a monitor blurs most frames, and on a 700x420 crop that is the difference
between readable node labels and mush.

Finding the box took two signals, because neither works alone:

- **Green border.** Precise, but only some references draw one. Colour alone found
  four of twelve.
- **Stillness.** The screenshot is a still image pasted onto handheld footage, so
  its pixels do not move. Text is static too but sparse - the footage keeps moving
  between the letters - so the test is on density per row, not on a plain mask.
  Stillness alone returns the WHOLE FRAME whenever the B-roll is itself a static
  shot, which several are.

Border first, stillness as fallback, and a full-frame result is reported rather
than returned. Nine of twelve, and the three misses are correct: they are not the
workflow format at all.

## The state-overlay format

Rebuilt from a reference that got traction. Two findings drive it:

- **It has no cuts.** One continuous take with five overlay states on top. What a
  cut detector reports as shots are overlay changes.
- **It is not beat-synced.** The track has a pulse and 0 of 5 changes land on the
  grid, median 349ms off. Copy the state DURATIONS (1.2, 2.0, 2.9, 3.0, 4.0 - they
  get longer, so the hook lands fast and each claim buys more read time), not the
  beat positions.

Type is 76-86px, roughly 2.4x the stack-note format. That is not a style choice:
three or four short lines with nothing competing can be that big, and the amount
of text is what sets the size.

Dropped from the reference: the emoji ticks (drawn instead - a system glyph
renders differently on every platform and reads as a text message), and the
full-bleed workflow screenshot. Its widest line also runs to x=985 where safe is
950, so it clips under the TikTok rail; `fit()` shrinks instead.

The reference ends on `Comment "Call"`. We do not: the frame says read caption,
the caption carries the keyword.

## Three reference formats

The twelve references are not one build, they are three, and each needs its own
renderer. All of them share the sync machinery.

| key | shape | where the content lives |
|---|---|---|
| single workflow | hook, then title + canvas with claims accumulating | `SCRIPTS` |
| listicle | hook and CTA pinned, canvas cycles through numbered agents | `LISTICLES` |
| stack | numbered step, one line, a white card with a tool logo | `STACKS` |

Two rules that only show up when a script is longer than the clip:

- A listicle's **headline count follows what fits**. Theirs says six because they
  had 14.9s; ours has 7.5 and fits four. A reel promising six and showing four is
  not shortened, it is broken.
- A stack keeps its **last** step when trimming, and renumbers. Cutting from the
  end drops ultron, which is the only reason we build the format; keeping source
  numbers while dropping middle steps counts 1, 2, 6.

## The stack-note format

Six rules, five of which are things you do not do. They are written out at the top
of `stack-note.py`; the short version is no panel, two tiles and a plus, one left
edge, weight as the only emphasis, literal hyphens, top third only.

The geometry is measured off a post that worked, not chosen. The number that
decides whether it reads as typed or as designed is the **line pitch: 1.18x the
type size**. At 1.5x it becomes a layout and the format stops working. Tiles 196
with 105 between, body 32, block starts at y 250 and takes 22 percent of the frame.

Copy is a data table (`VARIANTS`) with `**bold**` runs. Four lines is the ceiling
and it has to be an argument, not a list: line one is what everyone agrees with,
line two turns it, line three says where that leaves you, line four is the answer.
A line that runs past the safe edge is reported by name, because in this format an
overflowing line is a copy problem, not a sizing problem.

ultron's mark is a round orb on transparency, so in the tile pair it gets a drawn
plate (`PLATE`). This is the format where ultron uses the orb, not the wordmark.

## The n8n body slides

```sh
FONT_DIR=brand/fonts/extras/ttf TOOL_LOGOS=../apps/web/public/tools \
  WORKFLOWS="../6 boring use cases example" python3 slide-body.py brand/slides
```

Five bodies plus a closer, at 1080x1920. Built against
[`../carousel-design-kit/DESIGN-RULES.md`](../carousel-design-kit/DESIGN-RULES.md),
whose numbers transfer almost 1:1 - it renders 1080x1350, we render 1080x1920,
but the frames are the **same width** and the usable heights are within 60px.

**Every frame is on screen for 0.5 to 0.8 seconds.** That decides more than the
kit does, and where the two disagree it wins:

- **Clauses, not sentences.** A draft followed section 6 (write outcomes, not
  tasks) into two-line sentences. Correct for a carousel, wrong here - nobody
  reads prose in 0.6s. One clause with the point in bold is the whole budget.
- **Logos stay, and section 1 bans them.** It bans them for a page you dwell on,
  where a row of marks is texture. At 0.6s a row of marks is the fastest element
  on the frame, read in one glance and in parallel while a sentence is still
  being parsed. They earn it by being **true**: every mark is a tool that
  appears in that slide's canvas, read off its node labels. Six marks that did
  not exist were baked into `apps/web/public/tools/` rather than fetched, so the
  renderer still needs nothing but Pillow.
- **The closer is the same paper as the bodies.** The kit's closer inverts to a
  dark ground, which works when you arrive by swiping. In a reel a dark frame is
  a *cut*, and a cut at the end reads as a different video.
- **The CTA is always `comment`.** `read caption` is the state-overlay format's
  rule and it does not carry over here. This close is the reference's, word for
  word, and its type is measured rather than chosen: 74/90/74/100/62 on a nearly
  constant 106px leading, only about 1.35x between the lightest line and the
  heaviest. A version with 22px gaps and a 1.8x range read as five separate
  objects instead of one block. Weight carries the emphasis, size barely moves.
- **The title is solved for ONE LINE.** A headline that wraps has already lost -
  the second line arrives after the eye has moved on - and it hands 90px back to
  the artwork.

Everything that can move between frames is solved **across the set**: one title
size, one body size, one plate scale, one plate band, one logo baseline. Sized
per slide the body landed on 32, 33 and 34 within the same six, and type that
changes size between frames half a second apart reads as a rendering fault. The
sizes are the largest at which the whole set holds one shape - not "at which
nothing overflows", because a slide whose copy runs a line longer is a slide
whose plate jumps. If no size works the renderer says so and names nothing,
which means the copy needs rewriting.

Three things that cost a render each:

- **Trim the alpha before fitting a Figma export.** Figma exports the frame, not
  the drawing. One export is 818x752 on canvas with 340px of nothing under it,
  so fitting the canvas scaled the one workflow that needed no scaling to 0.81x
  while the others sat native.
- **Centre the plate in its band, do not hang it from the top.** Hung from the
  top, a short canvas left 340px of white above the logo row while a tall one
  left none - section 4's dead band exactly. Centred, the slack halves and it is
  symmetrical, so it reads as margin.
- **`ImageDraw` on an RGBA image writes alpha, it does not blend it.** A 35
  percent hairline drawn straight onto the page is a hole with the raw colour
  behind it; on flatten the plate came out ringed in solid white. Hairlines go
  on their own layer and get `alpha_composite`d.

`Group 2147203619.png` and `Group 2147203619-1.png` are two exports of the same
F5 install pipeline, so that folder holds **five** distinct workflows, not six.

## Danger zones, and the one that actually bites

```sh
python3 danger-zones.py brand/pairs/01.png       # -> 01_zones.png
```

The surfaces disagree, and only one of them destroys anything:

| | what it does on a 1080-wide frame |
|---|---|
| **feed carousel** | Instagram takes **4:5 at most** and CENTRE CROPS anything taller. A 1080x1920 upload silently loses **285px off the top and 285px off the bottom**. |
| profile grid | 1:1 centre crop for the thumbnail, so only y 135..1215 of a 1350-tall frame survives there |
| reel | no crop, but the UI is drawn on top: ~250 top, 480 bottom, 130 right rail |

A reel only **covers** your artwork. A crop **deletes** it, and it is invisible
until you post. The wrong-vs-right deck was built at 1080x1920 and the entire
check half of every pair - the answer, on a format whose whole point is the
answer - fell outside the crop.

**Render at the target size.** No margin survives a crop, so both carousel decks
are 1080x1350 natively. That is also why the design kit's 186 templates are all
1080x1350 and not something taller.

## Setup, from nothing

```sh
./setup.sh                # deps + fonts. enough to render
./setup.sh pull           # also pulls B-rolls, references and music (needs CF creds)
```

The container is ephemeral and has already been wiped mid-session once, taking
the whole toolkit with it. The generators are in git; `setup.sh` is everything
around them that is not, and it is small: three apt packages, six pip packages
and one font download.

What is deliberately NOT in git, and where it comes from instead:

| | where it lives | why not git |
|---|---|---|
| B-rolls, reference videos, music | the Library | `setup.sh pull` fetches it; ~270MB and it is already stored |
| Inter (36 faces) | rsms/inter v4.0 release | SIL OFL, but 28MB of zip for something one curl away |
| Extracted canvases, reference audio | derived | re-extracted by `setup.sh pull` from the reference videos |
| Finished reels | the Library | the output, not the source |

`reference-scripts.json` IS committed - it is the OCR'd copy of all twelve
references, and re-deriving it needs both the videos and tesseract.

```sh
export CFE=... CFK=... ACC=... DB=ed8a246f-2722-4a1f-95f5-90c2eaf6b4ab
python3 push-vault.py --items batch.json          # dry run, validates captions
python3 push-vault.py --items batch.json --go     # uploads + inserts
```

Both expect a `brand/` working directory beside them holding `wordmark_paths.json`,
`fonts/extras/ttf/Inter-*.ttf` and any source clip. Tool logos are read from
`apps/web/public/tools/`.

## The numbers worth not re-deriving

- Reel chrome, Instagram and TikTok combined, on 1080x1920: **250 top, 480 bottom,
  130 right** for the button rail, 60 left. Safe box is therefore 60..950 x 250..1440.
- A block can be at most **860 wide at x 90..950** and still clear the rail. That
  puts its centre at 520 against a frame centre of 540, which still reads centred.
- **Design at final pixels.** A card drawn at 1620 and shown at 1080 loses a third
  of every type size.
- Body-text floor on a 1080 frame is about **32px**; below that it stops being
  readable at phone size.
- An overlay should take roughly **two thirds of the safe height**, not all of it.
  Filling the frame makes it read as a poster pasted over the video.
- Dark clip means the panels have to **lift off** the footage. Near-black cards
  vanish; white cards punch holes. Charcoal at ~88% opacity with a light hairline.
- Pastel chips scaled down go to mud. Hold the hue, raise saturation as brightness
  drops (`chip_fill`).

## Captions

Rules and the reason for each are in `MONOLITH-RUNBOOK.md`. `push-vault.py`
refuses to upload if a caption has a hashtag, an emoji, an em dash, a quote or a
dollar sign, or if it does not open with `Comment KEYWORD `.
