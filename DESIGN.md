# BetterFind — Design System

> An instrument, not a brochure. Abyssal teal ground, hairline structure,
> rationed colour, and the product's own output as the artwork.

**Theme:** dark · **Density:** spacious but ruled · **Build:** vanilla HTML/CSS/JS, no build step

---

## 0. What this document is

This started as the **Auros style reference** (`DESIGN (6).md`) — a third-party
palette-and-type spec used to execute the first build. It is no longer only that.

This is now the **living design system for BetterFind**: the colour scheme is
unchanged from Auros, but the *shape* of the interface has moved — the header is
a rule rather than a band, cards have largely been replaced by ruled rows, a mono
face has been added for typed text and figures, and two purpose-built
data-visualisation palettes exist that the reference never had.

Read this in this order:

| If you are… | Read |
|---|---|
| Building a new landing section | §1 Philosophy → §4 Layout → §5 Components |
| Picking a colour or a size | §3 Tokens (never invent a value) |
| Building a screen in the product app | §1 Philosophy → §9 The application |
| Wondering why something looks like it does | §2 What changed from the reference |
| About to add an animation | §7 Motion |

Companion documents: `CLAUDE.md` (what we are building and why — product truth,
the AGO pipeline, content rules), `README.md` (how the first build was executed).
Where this file and `CLAUDE.md` disagree on *product* meaning, `CLAUDE.md` wins.
Where they disagree on *visual* execution, this file wins.

---

## 1. Design philosophy

Five principles. Each has a test you can actually apply to a screen.

### 1.1 Minimal means fewer objects, not less information

Minimalism here is not whitespace and three words on a slide. Our users are
marketers who are accountable for numbers; a page that shows them nothing is not
calm, it is empty. The discipline is on the **number of visual devices**, not on
the amount of content.

One idea per band. One artwork per idea. One accent per screen.

> **Test:** count the distinct visual devices in a section — fills, borders,
> radii, accent colours, icon styles. More than three and something is decoration.

### 1.2 Lines before boxes

A rule costs one pixel and organises a whole column. A card costs a fill, a
border, a radius, a padding box and a shadow decision, and it fences its content
off from everything beside it.

**Default to a hairline.** Reach for a bordered panel only when the content is a
genuine *artifact* — a stored answer, a report preview, a running flow — that
needs a frame because it is a picture of something that exists elsewhere.

This is the single biggest structural difference from the original reference,
which was card-first throughout. See §5.6.

### 1.3 The evidence is the artwork

We never draw an abstraction where the product's own output would do. No orbs, no
meshes, no particle fields, no gradient blobs standing in for "AI". The hero of
any section that makes a claim is the **capture** — a real answer, annotated — or
a real board, a real trend line, a real run log.

A number on screen with no path to the answers behind it is under-built.

> **Test:** point at any figure on the page. Can you say which stored answers
> produced it? If not, it is a decoration wearing a number's clothes.

### 1.4 Professional means legible under scrutiny

The audience will screenshot this and put it in a deck. Everything must survive
being looked at closely:

- Figures are `font-variant-numeric: tabular-nums`, always, so nothing twitches
  while a counter runs or a value updates.
- Every panel states its provenance — sampled *n* times, across *m* engines, on
  a date.
- Contrast is measured against the actual surface a thing sits on, not guessed.
- Nothing animates that a reader might be trying to read.
- Placeholder data is labelled as placeholder **in the markup**, every time.

### 1.5 Depth is colour, never shadow

Kept verbatim from the reference, and it is load-bearing. The surface stack is
`#011d1c → #012624 → #003734`, and separation between planes comes from that
stack plus hairlines. There is no `box-shadow` for elevation anywhere in the
system. The one legitimate `box-shadow` use is `inset 0 0 0 1px` as a border that
doesn't affect layout — that is a border, not elevation.

---

## 2. What changed from the Auros reference

Everything in the left column was in `DESIGN (6).md`. Everything in the right
column is what the system does now. **The right column is authoritative.**

| Reference said | We do now | Why |
|---|---|---|
| Header ~80px, logo + centred nav + CTA | **60px bar** (`--nav-h`); inside the bar the mark steps down to an 18px glyph / 17px word and the CTA to 13px text with 9×16px padding | The bar should read as *a rule with a logo on it*, not a band. It also stops competing with the hero. |
| Header transparent | Transparent at the top; on scroll it gains `rgba(1,29,28,.82)`, `blur(14px)` and a hairline bottom edge (`.nav.is-stuck`) | The page has to keep moving under a header that stays legible over artwork. |
| Cards everywhere (`#003734` fill, 16px radius, 36px padding) | **Ruled rows and hairline grids.** The feature list is rows separated by 1px rules. The solutions grid is a 1px `gap` over a `--hairline` background, so the container paints *through* the gap. The report band is a bordered, square-cornered well sitting on the page's own ground. | Cards fence content off and add four decisions per block. Rules divide without enclosing, and they hold up at any column count. |
| Particle sphere as the signature hero visual | **No orb.** The hero carries a two-stop radial `hero__glow` behind a centred text column; the signature moments are the headline that completes itself (rotating engine name + mark) and the scroll-scrubbed statement | Our differentiator is evidence, not atmosphere. §1.3. |
| Arrow icon button: 32×32 **square**, 6px radius, `rgba(3,81,75,.5)` fill | 32×32 **circle**, transparent, `inset 0 0 0 1px var(--hairline)`; the arrow translates on row hover | A filled square reads as a button on a page that has almost no buttons. A ring reads as an affordance without adding a surface. |
| Two fonts (Matter, Arial) | **Three roles.** DM Sans (`--font-matter`) for display and body, Arial (`--font-arial`) at 14px for controls and utility copy, **JetBrains Mono** (`--font-mono`) for prompts, captures, timestamps and figures | A prompt is typed text. Setting it as typed text is the cheapest possible signal that it came from a machine, not a copywriter. |
| Palette = teal stack + silver + lavender-phosphor only | Same palette, **plus two validated viz scales** (ordinal `--viz-*`, categorical `--viz-cat-1..5`) and **two signals**: `--color-citrine` (the citation highlighter) and `--color-coral` (not named) | The reference had no data. We do. Charts need scales that survive colour-vision deficiency; a highlighter needs to be the one saturated thing on screen. |
| Lavender-phosphor for statistics | Unchanged for statistics — **and** extended to the "you" tag and the rival mark inside a capture | Same job: luminous punctuation, used sparingly. |
| Aurora gradient reserved for the primary CTA | Unchanged — plus the headline rotator's word and mark, which clip the *bioluminescent* gradient | One gradient gesture per screen, and it is always either the thing to act on or the thing being named. |
| Cards 16 / buttons 6 — "the complete shape vocabulary" | 16 / 6, **plus** full-round (`50%`) for dots and icon buttons, **plus** 2–4px for inline annotation marks set inside running text | A 6px radius on a 7px status dot is a square. The micro-radii apply only to marks inside a line of type. |
| Section gap 68px, fixed | `--band: clamp(80px, 9vw, 140px)`, applied by one rule to every band, with named exceptions | Fixed gaps break at both ends of the viewport range. |
| Layout: centred narrow columns (~600px) | **Asymmetric two-column bands** — copy left, artifact right — with a sticky art slot that swaps its panel to match the row being read | The picture is the argument; the text beside it is the caption. |

### Removed, but still in the stylesheet

The **Demand** band (`.demand__*`, ~300 lines of `styles.css`) was cut from
`index.html` during the platform-grid rework; its markup survives only in
`index.html.pre-grid`. Those rules are currently dead, and the comment at
`index.html:199` still refers to "the demand table above". Either restore the
band or delete the block — see §11.

---

## 3. Tokens

**Rule: nothing is hardcoded in a component rule.** If a value doesn't exist as a
custom property in `:root`, add it there first. The exceptions currently in the
code are listed as debt in §11 — do not add to them.

### 3.1 Colour — surfaces and text

| Token | Value | Role |
|---|---|---|
| `--color-liquid-abyss` | `#012624` | **Surface 0.** Page canvas. Everything floats on this. |
| `--color-liquid-deep` | `#011d1c` | **Surface 1 (recessed).** Footer, panel interiors, fields, the stuck header's tint. |
| `--color-liquid-kelp` | `#003734` | **Surface 2 (raised).** Secondary button fill, skip link. Rarely a card now. |
| `--color-platinum` | `#ffffff` | Headings, nav, emphasised values, the lead line of a row. **Never body copy.** |
| `--color-liquid-mist` | `#edfffe` | Emphasised body, answer text, chip labels, section labels that need lift. |
| `--color-silver-mist` | `#bbc7c6` | **Default body colour.** Secondary text, resting link colour. |
| `--color-ash` | `#f2f2f2` | Pull-quotes only, where the teal undertone of silver is too coloured. |
| `--color-slate-deep` | `#707777` | Tertiary: table headers, meta, timestamps, captions, footer base. |
| `--color-lavender-phosphor` | `#fde9ff` | **Statistics and emphasis figures only** — plus the "you" tag and the rival mark. Never body text, never a control. |

### 3.2 Colour — signals and gradients

| Token | Value | Role |
|---|---|---|
| `--color-citrine` | `#f2e85c` | **The highlighter.** The one saturated accent, reserved for a cited passage. Dark ink on it, never light. |
| `--color-coral` | `#ff7a5a` | **The one alarm colour**, reserved for "not named" / a negative delta. |
| `--gradient-aurora` | cyan → white → pink, 90deg | Primary CTA fill, with `#012624` ink on it. Nothing else. |
| `--gradient-bioluminescent` | `rgb(0,130,124)` → `rgb(203,255,252)`, 90deg | Text-clipped fill for the rotating engine name and its mark; bar fills inside report panels use the same teal at low alpha. |

### 3.3 Colour — data visualisation

Two separate scales. **Never mix them, and never cycle either one.** A sixth
category folds into "Other" rather than inventing a hue.

**Ordinal** (one hue, monotone lightness — validated on `#012624`, light end clears 2:1):

| Token | Value | Role |
|---|---|---|
| `--viz-cited` | `#26a894` | Top of the scale — cited. Carries **dark** ink (`--color-liquid-abyss`); white on this fill measures 2.95:1 and fails. |
| `--viz-mentioned` | `#1b6459` | Mid — named but not cited. Carries `#7fd8c8` ink. |
| `--viz-muted` | `#8b9e9c` | Off-scale: axis labels, keys, "no data". |
| `--viz-good` | `#0ca30c` | Positive delta only. |

**Categorical** (fixed slot order, validated on `#011d1c`: adjacent-pair CVD ΔE 8.4, normal-vision 19.3, every slot clears 3:1):

`--viz-cat-1 #3987e5` · `--viz-cat-2 #d95926` · `--viz-cat-3 #199e70` · `--viz-cat-4 #c98500` · `--viz-cat-5 #d55181`

### 3.4 Colour — structure

| Token | Value | Role |
|---|---|---|
| `--hairline` | `rgba(255,255,255,.10)` | The default divider and panel border. The system's main structural device. |
| `--hairline-soft` | `rgba(255,255,255,.06)` | Dividers *inside* a panel, so nesting doesn't stack two equal lines. |
| `--hairline-strong` | `rgba(255,255,255,.28)` | Hover ring on an icon button; the elbow connecting a capture to its row. |
| `--wash` | `rgba(237,255,254,.03)` | **The only fill a ruled surface gets** — a breath of light on hover, or under an inline artifact. |
| `--mist-rgb` | `237, 255, 254` | Mist as channels, so a wash can be mixed at any alpha. |
| `--kelp-half` | `rgba(3,81,75,.5)` | Legacy from the reference's arrow button. |

### 3.5 Type

Three faces, three jobs. Nothing else gets loaded.

| Token | Stack | Weights | Job |
|---|---|---|---|
| `--font-matter` | **DM Sans**, ui-sans-serif, system-ui | 400, 500 | Display and body. Headings are **500 only** — no bold, no light. |
| `--font-arial` | Arial, Helvetica, system-ui | 400 | Controls only, at 14px: buttons, fields, footer links, utility copy. |
| `--font-mono` | **JetBrains Mono**, ui-monospace, Consolas | 400, 500 | Prompts, capture metadata, timestamps, table headers inside panels, figures beside typed text. **Never headings, never body copy.** |

DM Sans substitutes for the reference's Matter (not freely licensed) — geometric
grotesk, medium-weight-only headings, the same aggressive negative tracking.

**Roles as implemented** (all display sizes are fluid; the raw `--text-*` tokens
still exist as the underlying scale):

| Class | Size | Line height | Tracking | Use |
|---|---|---|---|---|
| `.h-xl` | `clamp(2.6rem, 6.2vw, 5rem)` | 1 | `-.04em` | Closer headline |
| `.h-lg` | `clamp(2.1rem, 4.6vw, 3.55rem)` | 1 | `-.038em` | Section headline |
| `.h-md` | `clamp(1.85rem, 3.4vw, 2.6rem)` | 1 | `-.03em` | Band headline inside a well |
| `.h-sm` | 24px | 1.3 | `-.02em` | Sub-headline |
| `.hero__title` | `clamp(2.35rem, 5vw, 4.15rem)` | 1.04 | `-.046em` | Hero only |
| `.statement__lead` | `clamp(2rem, 4.4vw, 3.4rem)` | 1.05 | `-.04em` | The one full-screen statement |
| `.kicker` | 12px / 500 | 1.4 | `.12em` uppercase | Eyebrow above every section headline |
| `.card__eyebrow`, `.feature__note` | 10px / 500 | — | `.15em` uppercase | Category label inside a block |
| `.stat__label`, `.quote__role` | 13px | — | `.055em` uppercase | Label under a figure |
| `.body-lg` | 16px | 1.5 | — | Lead paragraph, `max-width: 46ch` |
| body default | 16px | 1.4 | — | Everything else, in `--color-silver-mist` |

**Measure caps** are part of the system: 46ch lead, 44ch feature body, 52ch event
body, 78ch answer text, 24ch statement lead, 20ch hero title, 15ch section
headline. A headline that runs wider than its cap is a headline that is too long.

**Line-height contract:** 1.0 for everything above 36px; 1.3–1.6 for copy; 1.45–1.6
for anything you are expected to actually read (answers, run logs).

### 3.6 Spacing, layout, shape, easing

Base unit 4px. Scale: `12 16 20 24 28 32 36 40 48 64 80 120 140 160` as
`--spacing-*`. Nothing between these values.

| Token | Value | Notes |
|---|---|---|
| `--page-max-width` | `1440px` | The shell. |
| `--shell-pad` | `40px` → 32px ≤1080 → 20px ≤680 | The page gutter. One token, three widths. |
| `--nav-h` | `60px` → 54px ≤680 | The slim bar. |
| `--band` | `clamp(80px, 9vw, 140px)` | Vertical rhythm of every section, applied by one rule. |
| `--section-gap` | `68px` | Legacy from the reference; `--band` supersedes it. |
| `--radius-cards` | `16px` | Artifact panels only. |
| `--radius-small` | `6px` | Buttons, fields, chips, cells, inline panels. |
| — | `50%` | Dots and circular icon buttons. |
| — | `2–4px` | Inline annotation marks inside running text. Nothing else. |
| `--ease-out-quad` | `cubic-bezier(.25,.46,.45,.94)` | Entrances. |
| `--ease-snap` | `cubic-bezier(.16,1,.3,1)` | Anything that should feel mechanical: panel swaps, edge wipes, bar growth. |

---

## 4. Layout system

### 4.1 The shell and the band

Two primitives carry the whole page.

```
.shell   width:100%; max-width:1440px; margin-inline:auto; padding-inline:var(--shell-pad)
.band    padding-block: clamp(80px, 9vw, 140px)   /* applied to every <section> by one rule */
```

Every kicker, headline and artifact aligns to the shell's **left edge**. There is
no centred-column layout except the hero, the statement and the closer — the
three moments that are deliberately not instrument panels.

Named exceptions to the band rhythm exist and are documented in the stylesheet at
the point of use (a band that opens off another band's closing rule sheds its own
top padding, and so on). Add an exception only with a comment saying which two
sections it reconciles.

### 4.2 The asymmetric band

The default shape for a section that has both an argument and an artifact:

```
┌ shell ─────────────────────────────────────────────────────────┐
│  KICKER                                                        │
│  Headline that runs to about 15ch      │                       │
│  Lead paragraph, capped at 46ch        │      ARTIFACT         │
│                                        │      (sticky)         │
│  ── ruled row ────────────────────     │                       │
│  ── ruled row ────────────────────     │                       │
│  ── ruled row ────────────────────     │                       │
└────────────────────────────────────────────────────────────────┘
```

Columns are `minmax(0, 1fr) minmax(0, 1.15fr)` — the picture gets the wider half,
because the picture is the argument. Column gap `--spacing-64`.

### 4.3 The sticky art slot

The right column holds every panel in one stack and shows only the one belonging
to the row being read. It is centred on the viewport's middle band rather than
pinned under the header, so a short board and a tall flow diagram land on the
same centre line:

```css
top: max(var(--nav-h), calc(50svh - var(--art-half, 220px)));
```

`main.js` measures the live panel and writes `--art-half` and `--art-tail`.
Without JS the `.is-armed` class is never added, the slot stops being sticky, and
every panel simply flows in the document — the section still reads.

The slot is a `container-type: inline-size` container, so panels inside it respond
to *the column*, not the viewport (`@container (max-width: 620px)`).

### 4.4 Breakpoints

| Width | What changes |
|---|---|
| `≤1240px` | The artifact stops sharing the band and takes the full measure back — **at the type size it was drawn at** (figures and questions step *up*, they don't shrink). |
| `≤1080px` | Nav links and actions give way to the drawer toggle. Two-column bands stack (`head / art / feat`). Sticky art goes static. Three-up grids become two-up. The well stacks and its preview border moves from left edge to top edge. |
| `≤680px` | Gutter 20px, band 72px, nav 54px. Everything goes single column. Tables that were a comparison stop being one: headers hide and each row becomes a two-line block. Comparison halves stack with a top rule instead of a left rule. |
| `≥1081px` and `≤640px` **tall** | A short viewport gets a *shorter picture*, not a scaled one: panel padding tightens and the flow shows fewer rows. |

---

## 5. Components

### 5.1 Header — the slim bar

60px tall, sticky, transparent until scrolled. Mark left, uppercase 12px links
with `.12em` tracking centred via `margin-inline: auto`, quiet log-in link plus
one aurora CTA right. Every element inside the bar is one step smaller than its
equivalent elsewhere on the page. Below 1080px the links and actions are replaced
by a 36px toggle whose two 1px bars cross into an X, opening a `--color-liquid-deep`
drawer with a hairline top edge.

### 5.2 Buttons

| Class | Fill | Ink | Use |
|---|---|---|---|
| `.btn--aurora` | `--gradient-aurora` | `#012624` | **One per screen.** The primary action. |
| `.btn--kelp` | `--color-liquid-kelp` | white | Secondary action beside a primary. |
| `.btn--ghost` | transparent + `inset 0 0 0 1px var(--hairline)` | mist | Tertiary. |

All buttons: `--radius-small`, `--font-arial` 14px, `line-height: 1`, padding
15×22px (`.btn--sm` 11×16px), `letter-spacing: .02em`. Hover is a 1px lift plus a
`brightness(1.06)` or a surface step — never a shadow, never a scale.

### 5.3 Links

`.textlink` — 14px Arial, silver, with a `↗` glyph in a span that translates
`(2px, -2px)` on hover. This is the standard "go deeper" affordance and it is
what appears at the bottom of a card or row. `.link-quiet` is the same size with
no glyph, for utility navigation.

### 5.4 Kicker

Every section opens with one. 12px, weight 500, `.12em`, uppercase, silver. It
names the section as a category — `Platform`, `Solutions`, `Events`, `AGO Report`
— and it is the main reason the page reads as instrumentation rather than
marketing. Do not skip it, and do not write a sentence in it.

### 5.5 The ruled feature row

The replacement for the reference's stacked cards, and the system's most-used
structural component.

```
──────────────────────────────────────────────────  ← 1px --hairline
  Feature title (clamp 1.5–2.25rem, -.03em)   ( ↗ )   ← 32px ring button
  Body copy, capped at 44ch, silver.
  OPTIONAL 10px UPPERCASE NOTE
──────────────────────────────────────────────────
```

48px vertical padding, `border-top` on every row and `border-bottom` on the last.
Hover fills the row with `--wash` — the only fill it ever gets. As the row settles
into view a light wipes along its top edge from the left (`edge-wipe`) and fades;
the rule is not drawn twice.

### 5.6 When a panel *is* allowed

A bordered `--radius-cards` panel is legitimate for exactly one thing: **an
artifact**. Currently four of them —

| Panel | What it is |
|---|---|
| `.capture` / the answer block | One stored answer, annotated. The atom of the product. |
| `.board` | The answer scoreboard: which engines name the brand, question by question. |
| `.vscore` | Visibility score by persona over time — a real multi-line trend. |
| `.aflow` | The agent canvas and its run log, with a light travelling down the wire. |

Everything else is a ruled row, a hairline grid, or a well.

The **hairline grid** (`.cards`) is how a three-up still reads as one object:

```css
.cards { display:grid; gap:1px; background:var(--hairline); border-block:1px solid var(--hairline); }
.card  { background:var(--color-liquid-abyss); }
```

The 1px gap *is* the rule — the container paints through it, so the grid stays
evenly divided however the columns wrap or reflow.

The **well** (`.well`) is a flat band split down the middle by a border: copy left,
a clipped artifact bleeding off the right edge. Square corners, hairline edge, the
page's own background. Deliberately not a card.

### 5.7 The capture

The most important component in the system. It has four parts and they are always
in this order:

1. **Meta** — engine mark, prompt, timestamp. Mono, 10–11px, `--color-slate-deep`,
   `.16em` uppercase.
2. **Answer** — 15px, line-height 1.6, `--color-liquid-mist`, capped at 78ch.
   Real prose, set to be read.
3. **Marks** — only two things are ever marked: a **rival that got chosen**
   (`--color-lavender-phosphor` on a 14% wash) and the **source the engine leaned
   on** (an underline via `inset 0 -1px 0`). On the landing page's demand
   treatment, a cited passage takes the citrine highlighter with abyss ink.
   Nothing else is highlighted, so the annotation reads as analysis.
4. **Provenance** — sources as chips, verdict, and the sample count. One answer
   proves nothing and the panel says so.

### 5.8 Fields, chips, cells

- `.field` — 48px, `--color-liquid-deep` fill, hairline border, 6px radius, Arial
  14px. Focus moves the border to silver; `:focus-visible` adds the lavender ring.
- `.chips li` — 10px `.15em` uppercase, transparent with an inset hairline, 6px.
- `.cell` — 30×22px, 6px radius, the ordinal viz fill, tabular figures. **Every
  state also carries its own glyph** (rank numeral / dot / empty outline) so the
  grid never leans on colour alone.

### 5.9 Footer

`--color-liquid-deep`, 120px top padding. Brand column plus four link columns at
`1.2fr + 4×1fr`, Arial 14px links, a live-status dot in lavender, and a base row
separated by `--hairline-soft` in `--color-slate-deep`. The footer is where the
mark runs at **full** size — the contrast with the slim header is deliberate.

---

## 6. Data visualisation rules

These are non-negotiable because they are what makes the product look like an
instrument.

1. **Pick the scale from the data, not the palette.** Ranked or graded values →
   the ordinal `--viz-*` scale (one hue, monotone lightness). Distinct entities →
   the categorical `--viz-cat-*` slots, in fixed order, never cycled.
2. **Colour never carries identity alone.** Every series is also named and
   valued in its key; every cell state also has a glyph. The chart must work in
   greyscale and under every CVD type.
3. **Check ink against the actual fill.** White on `--viz-cited` fails at 2.95:1 —
   that fill takes abyss ink. Record the measurement in a comment when you add a
   new pairing.
4. **The key is also the headline.** The persona chart's legend carries the dot,
   the name, the current value and the delta — so the reader gets the summary
   without decoding the plot.
5. **Provenance on the artifact.** Date range, sample count, engine list — on the
   panel, not in the copy around it.
6. **Static SVG or static markup wherever possible.** Both current charts render
   with no canvas and no script, and are readable with JS off. A chart that needs
   JS to exist is a chart that vanishes from a screenshot of a broken page.
7. **Wide content scrolls inside its own box.** `overflow-x: auto` on the panel;
   the page body never scrolls sideways.
8. **Tabular figures everywhere**, and a baseline that reads as a floor
   (`--hairline`) rather than as one more gridline (`--hairline-soft`).

---

## 7. Motion

Motion is in service of reading. Nothing bounces, nothing spins, nothing enters
from off-screen sideways.

### 7.1 The four gestures

| Gesture | Where | Spec |
|---|---|---|
| **Rise** | Any block entering view | `[data-rise]`: container gets `rise-soft` (blur 3px, 12px lift, 8° tilt, .9s); children get `rise` (blur 8px, 24px lift, 26° tilt, .6s) cascading at 80ms per child, up to six. `--ease-out-quad`. `will-change` is dropped once played. |
| **Reveal** | Simple fade-up for standalone elements | `.reveal`: 18px lift, .7s, honours a `--d` delay. |
| **Focus pull** | The statement, once per page | Words split at load; each word's blur is tied to **scroll position**, not a timeline, so it scrubs both ways. Two words in flight at once on a smoothstep. The section grows to a 250svh track (220svh mobile) and the copy sticks inside it while drifting upward at ~⅓ scroll speed, so the page never stops. |
| **Wipe / grow** | Rules and bars | `edge-wipe` runs a light along a row's top edge (1.1s, `--ease-snap`); `bar-grow` grows a fill from the left at 90ms per row. |

Plus three small ones: the hero's WAAPI stagger entrance; the headline rotator,
whose slot animates its **width** to the live word (.5s) so the line stays
optically centred; and the stat counters, which ride a spring (stiffness 110,
damping 20, mass 1) so a figure glides into place without overshoot.

### 7.2 Rules

- **Duration** .2–.35s for interaction feedback, .5–1.1s for entrances. Nothing
  longer, except the wire light (3.2s, ambient, on a per-node stagger).
- **Scroll-linked beats timeline-driven** for anything the reader controls.
- **Hover** = colour, surface, ring or a ≤2px translate. Never scale, never shadow.
- **Never animate text a reader is mid-sentence on**, and never animate a figure
  after its first landing.
- One ambient loop per screen, maximum.

### 7.3 The reduced-motion contract

**Every animation must have a static fallback, and the page must be fully readable
with JS off.** This is not a nice-to-have; it is a build requirement. Under
`prefers-reduced-motion: reduce`:

- The scrub never arms — the statement is a plain full-screen block, already sharp.
- Reveals, rises and counters are in their end state from the first frame.
- The blinking caret, the edge wipe, the panel swap and the wire light are off;
  the wire light is parked mid-wire at 55% opacity so the picture still reads.
- Bars are drawn at full width.
- Global `transition-duration: .01ms` and `scroll-behavior: auto`.

With JS disabled entirely: the hero hold releases on a 2s timer, the sticky art
slot flows every panel inline, the split never happens, and every figure renders
from the markup's own authored value.

---

## 8. Accessibility contract

Not a checklist to run at the end — these are build requirements.

- **Skip link** first in the document, visible on focus.
- **Focus is always visible**: `1px solid var(--color-lavender-phosphor)` at 3px
  offset. Never remove it; fields get it in addition to their border change.
- **Real heading order.** One `h1`. Sections lead with `h2`. Cards and rows use
  `h3`. The kicker is a `<p>`, not a heading.
- **Icon-only controls carry `aria-label`.** Decorative SVG is `aria-hidden`.
- **Meaningful SVG carries `<title>` and `<desc>`**, and a chart that encodes data
  is followed by the same figures in a table or a key.
- **Never colour alone.** Glyph, label or value, always.
- **`aria-expanded` / `aria-controls`** on the drawer toggle; the drawer is
  `hidden` until opened.
- **Contrast measured, not assumed** — against the surface the element actually
  sits on. Body silver on abyss, mist on deep, dark ink on any light fill.
- **Animated text keeps a plain `aria-label`** on its container so a screen reader
  gets the sentence, not the word soup (see the hero title).

---

## 9. The application

The landing page and the product share one system. What changes is density, not
vocabulary.

### 9.1 The one structural rule

**Every screen maps to a stage of the AGO pipeline** (`CLAUDE.md` §3). If a screen
doesn't sit on `prompt universe → harvest → parse → diagnose → act → measure`,
ask why it exists.

| Stage | Screen | Primary object |
|---|---|---|
| Prompt universe | Prompts | Prompt sets, clusters, funnel coverage |
| Harvest | Runs | Schedules, engines, regions, personas |
| Parse | **Captures** | The stored answer — the evidence atom |
| Diagnose | Visibility | Share of voice, citation rate, competitor board, source leaderboard |
| Act | Recommendations | Prioritised fixes, briefs |
| Measure | Trends | Deltas, alerts, reports |

### 9.2 App shell

- **Left rail**, not a top nav. The product's navigation is a list of pipeline
  stages and it does not change per screen; the slim top bar is a landing-page
  device. The rail sits on `--color-liquid-deep`, separated from the canvas by a
  single `--hairline`.
- **Content on `--color-liquid-abyss`**, full-bleed, with a `--shell-pad` gutter.
  No max-width inside the app — a table should use the screen it has.
- **One `.btn--aurora` per screen**, at most. Everything else is ghost or a
  textlink.
- **Header of a screen** = kicker (the stage) + `h1` (the object) + the
  provenance line (date range, sample count, engines). Provenance is part of the
  header, not a footnote.

### 9.3 Density

The landing page is spacious because it is being read once. The app is being read
daily, so it steps the scale down one notch — but **the vocabulary is identical**.

| | Landing | App |
|---|---|---|
| Band padding | `clamp(80,9vw,140)` | `--spacing-32` between blocks |
| Row padding | 48px | 12–16px |
| Body size | 16px | 14px |
| Panel padding | 24–40px | 16–20px |
| Headline | `clamp` display sizes | 24px `h-sm`, no fluid display type |

Everything else — the hairlines, the wash-on-hover, the mono for typed text, the
tabular figures, the ordinal cell scale, the 6px/16px radii — is unchanged.

### 9.4 Tables are the app's primary surface

Most product screens are a table with a drill-down. The board component (§5.6) is
the reference implementation.

- Header row: mono, 10px, `.16em`, uppercase, `--color-slate-deep`, on a
  `--hairline-soft` bottom border.
- Rows: `--hairline-soft` between, `--wash` on hover, the lead row in platinum.
- A row's own value can be drawn a second time as a left-anchored background wash
  scaled to its magnitude — the row fills to the width of its own demand. Use a
  soft tail so the fill never cuts a word in half.
- **Every row opens.** The expanded state is a capture (§5.7) inset under the row,
  connected back to it by a rounded elbow in `--hairline-strong`.

### 9.5 Numbers must be openable

The rule from §1.3, stated as an interaction requirement: **every aggregate is a
link to the captures behind it.** Share of voice opens the answers it was
computed from. A citation rate opens the answers that carried a citation. A
competitor's rank opens the answers that named them.

If you are designing a tile, design the drill-down in the same pass. A tile
without one does not ship.

### 9.6 States

Design all four, every time. An empty state is not an afterthought — for a
sampling product it is the most common first-run experience.

| State | Treatment |
|---|---|
| **Empty** | Say what will fill it and give the action that starts it. Never an illustration. "No captures yet — your first run is scheduled for 06:00 UTC." |
| **Loading** | Hairline skeletons at the real row heights, no spinners, no shimmer. The layout must not jump when data lands. |
| **Partial** | Show what landed and label what didn't. A run that covered 4 of 6 engines says so on the panel. |
| **Error** | Plain sentence in `--color-coral`, the retry as a ghost button, the technical detail behind a disclosure. |

### 9.7 App-specific vocabulary

- **Engine marks** (`#i-openai`, `#i-gemini`, `#i-claude`, `#i-perplexity`) are
  defined once per document as `<symbol>` and pulled in with `<use>`. Never
  re-paste a path. They inherit `currentColor`, or take the brand gradient via
  `fill="url(#brand-grad)"`.
- **Status dots** are 6–7px, full-round, and always paired with a word.
- **Live** state is `#7fe3c6` — currently the app's only unrationed colour, and
  the first thing to tokenise (§11).
- **Graph paper** (`--hairline-soft` at 26px) marks a canvas you build on. Use it
  only for builder surfaces, never behind reading content.

---

## 10. Do's and don'ts

### Do

- Divide with a hairline before you reach for a panel.
- Keep the surface stack teal — `#011d1c → #012624 → #003734`. Never grey, black
  or blue.
- Set every heading at weight 500. No bold, no light, at any display size.
- Track every eyebrow and label 0.08–0.15em, uppercase, 10–13px.
- Reserve lavender-phosphor for figures, citrine for a citation, coral for "not
  named". One accent per screen.
- Set prompts, timestamps and machine text in the mono face.
- Use tabular figures for anything numeric.
- State the sample count on the artifact that depends on it.
- Cap your measure. 44–52ch for body, 78ch for answer text.
- Give every animation a static fallback and every screen a no-JS reading.
- Mark placeholder data as placeholder in the markup.

### Don't

- Don't use `box-shadow` for elevation. Depth is surface colour and hairlines.
- Don't wrap content in a card because it needs separating — that is what a rule
  is for. Panels are for artifacts.
- Don't use pure white for body copy, and don't use lavender-phosphor for body
  copy or controls.
- Don't put light text on citrine or on any light fill — those carry abyss ink.
- Don't introduce a radius outside 16 / 6 / 50% / (2–4px inline marks).
- Don't put the aurora gradient on text, borders, or anything larger than a
  button.
- Don't cycle a categorical palette past its fifth slot — fold into "Other".
- Don't encode meaning in colour alone.
- Don't show a metric with no route to its captures.
- Don't animate something a reader is reading.
- Don't add a second ambient loop to a screen that already has one.
- Don't claim a capability the product doesn't have. Roadmap reads as roadmap.

---

## 11. Known debt and open decisions

### Debt — fix on next touch

1. **Dead Demand CSS.** ~300 lines of `.demand__*` in `styles.css` with no markup
   in `index.html`. Restore the band or delete the rules; also fix the stale
   comment at `index.html:199`.
2. **Untokenised colours.** `#7fe3c6` — the live/positive accent — appears four
   times as a hex plus repeatedly as `rgba(127,227,198, …)` in the agent wire, and
   it is a *sixth* signal colour the palette never declared. Also `#cbfffc` (the
   wire light), `#00463f` (kelp hover), `#012624` hardcoded as aurora-button ink,
   and `#7fd8c8` (ink on `--viz-mentioned`). All violate the tokens-first rule;
   promote them to `:root` — `--color-live` and `--live-rgb` at minimum.
3. **Whole page is still Profound's content.** Title, meta, mark, wordmark, nav,
   copy, case study, events and footer are all placeholder until de-branded — see
   `CLAUDE.md` §1. Nothing in this file assumes that copy is approved.
4. **Placeholder metrics** — `100M+`, `4.2B`, `38%`, `acme.com`, the persona
   trend, the rank board, the case-study attribution. All illustrative, all
   commented as such. They must not survive into anything public.
5. **`--section-gap`** is superseded by `--band` and can be removed once nothing
   references it.

### Open decisions — do not guess, ask

1. **Light or dark.** Everything here is dark. A light "instrument panel" surface
   remains the single strongest possible break from Profound, and it would mean
   rewriting the token set wholesale. *Unresolved.*
2. **Brand palette and type.** Still Auros tokens with DM Sans substituting for
   Matter. A real BetterFind identity has not been designed. *Unresolved.*
3. **Signature interaction.** Currently the scrubbed focus pull plus the
   self-completing headline. The stated ambition is something product-derived — a
   live answer being parsed into citations in front of the reader. *Unresolved.*
4. **Name spelling** — `BetterFind` vs `Better Find` — and the domain. *Unresolved.*

---

## 12. Working in the repo

```
index.html      markup + content
styles.css      tokens (:root) then components, in page order
main.js         hero stagger, scrubbed statement, rotator, reveals, art slot,
                counters, header/drawer, demo forms
DESIGN.md       this file — the design system
CLAUDE.md       product truth: what AGO is, what the UI must communicate
README.md       how the original reference build was executed
*.bak, *.pre-*  previous versions — do not edit, do not delete without asking
```

No build step. Open `index.html`, or serve it:

```
python -m http.server 5599
```

**Conventions**

- Vanilla only. No framework, no bundler, no dependencies.
- Tokens first. If the value isn't in `:root`, put it there before you use it.
- Comment the *why* at the point of use — the stylesheet's existing comments
  explain intent, not syntax. Match that.
- Sections in `styles.css` follow page order and carry a banner comment.
- This directory sits inside a larger home-directory git repo with unrelated work
  in progress: **stage explicit paths, never `git add -A`.**
- Never discard uncommitted work with a whole-file `git checkout`.
- These files are untracked — copy to `*.pre-<change>` before a large edit.
