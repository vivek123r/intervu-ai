---
name: Intervu AI
description: A signal-calibration interface for focused interview preparation.
colors:
  lacquer-black: "#050505"
  charcoal-black: "#080808"
  instrument-black: "#0b0b0c"
  surface-solid: "#121212"
  surface-glass: "rgba(16, 16, 17, 0.84)"
  surface-warm: "rgba(26, 24, 19, 0.68)"
  champagne-pale: "#fff0b5"
  champagne-light: "#ffd976"
  signal-gold: "#f0b94c"
  warm-gold: "#d99a2b"
  deep-gold: "#b77a18"
  bronze: "#8a5a12"
  warm-white: "#f7f5f0"
  warm-gray: "#aaa7a0"
  muted-gray: "#74716b"
  ink-on-gold: "#15110a"
  hairline: "rgba(255, 255, 255, 0.09)"
  gold-hairline: "rgba(240, 185, 76, 0.42)"
typography:
  display:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 7.2vw, 6rem)"
    fontWeight: 560
    lineHeight: 0.94
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4.5vw, 4.5rem)"
    fontWeight: 560
    lineHeight: 0.98
    letterSpacing: "-0.038em"
  title:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 4rem)"
    fontWeight: 540
    lineHeight: 1
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  instrument-label:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.68rem"
    fontWeight: 620
    lineHeight: 1.2
    letterSpacing: "0.11em"
  measurement:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "24px"
  xl: "32px"
  section: "clamp(5rem, 9vw, 9rem)"
components:
  button-primary:
    backgroundColor: "{colors.warm-gold}"
    textColor: "{colors.ink-on-gold}"
    rounded: "{rounded.md}"
    padding: "0.85rem 1.2rem"
    height: "46px"
  button-ghost:
    backgroundColor: "rgba(255, 255, 255, 0.035)"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.md}"
    padding: "0.85rem 1.1rem"
    height: "46px"
  input:
    backgroundColor: "rgba(255, 255, 255, 0.035)"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.md}"
    padding: "0 0.9rem"
    height: "48px"
  instrument-surface:
    backgroundColor: "{colors.surface-glass}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.lg}"
    padding: "1.25rem"
  choice-chip:
    backgroundColor: "rgba(255, 255, 255, 0.025)"
    textColor: "{colors.warm-gray}"
    rounded: "{rounded.xl}"
    padding: "0.6rem 0.78rem"
    height: "40px"
---

# Design System: Intervu AI

## Overview

**Creative North Star: "The Signal Calibration Console"**

Intervu AI feels like a calm instrument used before a consequential moment: black lacquer, charcoal measurement surfaces, warm-white language, and sparse champagne-gold state. The system borrows the discipline of airport wayfinding and financial terminals without their institutional coldness. Content remains primary; illumination exists to clarify position, progress, and action.

The interface is dense only where evidence benefits from comparison. Marketing surfaces use an editorial narrative and live product instruments; application screens pair one dominant workspace with a contextual rail; interview mode removes navigation and creates a single attentive chamber. Generic SaaS card mosaics, ambient neon, stock AI imagery, and decorative glass are explicit anti-references.

**Key Characteristics:**

- Gold communicates current state, earned progress, a live signal, or the primary action.
- Dark surfaces differ by material and elevation, not by arbitrary color blocks.
- Fine route lines, score rings, waveforms, and the black-glass interviewer form the product’s visual grammar.
- Every screen resolves to one obvious next action.
- Motion is short, directional, and quiet enough to preserve concentration.

## Colors

The palette moves from lacquer black through warm charcoal to dimensional champagne; white is slightly warm so the interface never feels blue or sterile.

### Primary

- **Signal Gold:** the live/current accent used for selected routes, progress, waveform peaks, focused states, and small success evidence.
- **Champagne Light:** the high-luminance edge and focus color used where contrast or metallic reflection needs a pale crest.
- **Bronze and Deep Gold:** the shadow side of metallic buttons, progress strokes, and directional accents.

### Neutral

- **Lacquer Black:** the application environment and deepest canvas.
- **Instrument Black:** the quiet layer beneath charts, interview stages, and dense workspaces.
- **Warm White:** primary copy and decisive labels.
- **Warm Gray:** supporting copy with enough contrast for normal-size text.
- **Muted Gray:** metadata and tertiary labels; never use it for essential instructions.
- **Hairline:** the default boundary. Gold hairlines are reserved for selected or high-value surfaces.

**The Gold Is State Rule.** Gold must answer “what matters now?” If it does not communicate action, position, progress, or a live signal, keep it neutral.

**The Warm Contrast Rule.** Secondary text on gold-tinted surfaces inherits a warm neutral; cold gray does not sit on warm material.

## Typography

**Display Font:** Geist Sans (with `ui-sans-serif` and `system-ui` fallbacks)
**Body Font:** Geist Sans (with `ui-sans-serif` and `system-ui` fallbacks)
**Measurement Font:** Geist Mono (with `ui-monospace` fallback)

**Character:** Geist supplies a composed, modern voice with enough neutrality for dense evidence and enough width for editorial headlines. Weight—not extreme compression or ornamental tracking—creates authority. Mono appears only where fixed-width comparison improves understanding.

### Hierarchy

- **Display** (560, fluid 3–6rem, 0.94): landing headlines and singular cinematic statements.
- **Headline** (560, fluid 2.25–4.5rem, 0.98): primary application page titles.
- **Title** (540, fluid 2–4rem, 1): major section transitions and report conclusions.
- **Body** (400, 1rem, 1.6): explanatory copy, capped near 65–75 characters per line.
- **Instrument label** (620, 0.68rem, 0.11em): short functional labels inside instruments only; never an eyebrow above a page or marketing heading.
- **Measurement** (500, variable): timers, dates, IDs, scores, and tabular values with tabular numerals.

**The Heading Carries It Rule.** Never add a decorative kicker above a heading. Rewrite the heading or place a genuine status beside the content instead.

**The Measurement Rule.** Mono earns its place only when alignment, timing, or exact comparison matters.

## Layout

The global frame is capped at 1440px with 24px desktop gutters and adaptive section spacing. Marketing starts as an editorial split: language occupies the left field while a live instrument constellation occupies the right. Product screens use a dominant work surface plus a narrower evidence or action rail. Dense metrics sit inline as instruments rather than becoming a row of promotional cards.

At 1024–1279px, rails compress or move below their dominant workspace. At 768–1023px, multi-column instruments become two-stage compositions. Below 768px, the layout becomes task-first, uses a persistent five-item bottom navigation, converts the interview calendar to agenda view, and moves nonessential evidence below the next action. The live interview mobile order is orb, question, transcript, waveform, and controls.

Spacing follows tight semantic groups (8–16px), component padding (16–24px), workspace separation (24–40px), and cinematic section separation (fluid 80–144px). Headings always receive more space above than their supporting copy receives below.

**The Dominant Surface Rule.** One surface owns the task. Supporting material can frame or explain it but may not create an equal-weight card wall.

## Elevation & Depth

Depth is a hybrid of tonal layering, one-pixel boundaries, inset top highlights, and soft offset shadows. Resting surfaces use a 20px/60px black shadow; floating controls and popovers use a deeper 28px/90px shadow. Gold bloom is secondary and low-opacity. Navigation, dialogs, and floating controls may blur the environment; ordinary content surfaces do not receive blur by default.

### Shadow Vocabulary

- **Instrument depth:** `0 20px 60px rgba(0,0,0,.34)` for primary panels.
- **Floating depth:** `0 28px 90px rgba(0,0,0,.54)` for popovers, command search, and detached controls.
- **Gold action depth:** `0 10px 34px rgba(183,122,24,.2)` plus inset highlights for polished primary controls.

**The Material Before Glow Rule.** Establish edge, directional light, and offset depth before adding bloom. A zero-offset halo cannot carry elevation by itself.

## Shapes

The recurring radius scale is 8px for compact controls, 12px for buttons and fields, 16px for standard instruments, and 24px for large focal surfaces. Fully round shapes are limited to scores, orbital nodes, avatars, and compact choice controls. Borders remain one pixel; a gold border indicates selection or importance rather than decoration.

Signal lines and rings are hairline geometry. The interviewer orb is the only large organic silhouette. Grid overlays are not a general background token; they are local measurement canvases in the interview chamber and data instruments.

## Components

### Buttons

- **Shape:** tactile, gently rounded controls (12px) with a 46px minimum height; mobile actions expand toward 48–52px.
- **Primary:** a bronze → warm gold → pale champagne → warm gold metallic field with a dark label, pale top edge, and inset lower shadow.
- **Hover / Focus:** lift 2px, brighten the edge, cross once with a directional sheen, move trailing arrows 3px, and show a 2px champagne focus ring offset by 3px.
- **Active:** compress to 0.97 scale. Disabled actions retain shape and reduce emphasis rather than disappearing.
- **Ghost:** translucent charcoal with a neutral boundary; hover introduces a restrained warm tint.

### Chips

- **Style:** 40px compact choices with a neutral translucent interior and warm-gray copy.
- **State:** selected chips use a gold hairline and faint warm fill. Reserve pill geometry for filters, tags, statuses, and compact choices.

### Cards / Containers

- **Corner Style:** 16px by default; 24px only for focal panels.
- **Background:** translucent instrument black at rest, warm charcoal for focused evidence, and directional gold material only for high-priority panels.
- **Shadow Strategy:** instrument depth at rest; meaningful interactive surfaces lift 3px and reveal a local pointer spotlight.
- **Border:** one neutral hairline, replaced—not doubled—by a gold hairline when selected.
- **Internal Padding:** 20–32px according to hierarchy.

### Inputs / Fields

- **Style:** 48px charcoal fields with a 12px radius, neutral hairline, and warm-white text.
- **Focus:** gold edge, faint warm interior, and a 3px low-opacity focus field.
- **Error / Disabled:** preserve label and recovery guidance; do not rely on color alone.

### Navigation

Desktop marketing navigation floats inside a 16px dark-glass shell. Authenticated navigation becomes a full-width sticky instrument bar. Active routes use a one-pixel moving gold underline. Below 768px, primary destinations move into a five-item bottom navigation while profile and search stay in the compact top bar.

### Score Ring

The score ring is an evidence instrument, never a decorative donut. It uses one neutral track, one dimensional gold stroke, a tabular value, and a nearby explanation of what changed or what the score means.

### AI Interviewer Orb

The orb is reflective black glass with a thin halo and sparse concentric signal lines. It breathes while speaking, responds to microphone amplitude while listening, and becomes nearly still when waiting. It never becomes a human avatar or spins continuously.

## Do's and Don'ts

### Do:

- **Do** reserve gold for the primary action, current state, earned progress, and live signals.
- **Do** make the next best action visible without requiring chart interpretation.
- **Do** keep body copy warm, readable, and near 65–75 characters per line.
- **Do** use real Web Audio amplitude for a live microphone waveform and deterministic code for numeric analytics.
- **Do** keep motion within roughly 180–450ms and respect reduced-motion preferences.
- **Do** label realistic fixtures as demo or sample data.

### Don't:

- **Don't** place a decorative kicker or eyebrow above a heading.
- **Don't** turn the product into a repeated grid of equal cards or use a progress ring in place of explanatory content.
- **Don't** apply glass blur, gold borders, or glow to every surface.
- **Don't** use gradient text, cold neon, stock robots, fake human interviewers, or emoji as interface icons.
- **Don't** use mono as a “technical” costume or tiny muted text for essential instructions.
- **Don't** generalize measurement grids, particles, or parallax beyond the instrument surfaces that need them.
