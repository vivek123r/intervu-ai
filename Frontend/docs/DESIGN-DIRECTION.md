# Intervu AI design direction

## Thesis

Intervu AI is a signal-calibration instrument for interview readiness, not a card dashboard. The interface visualizes one legible transformation: calendar signal becomes preparation, practice becomes evidence, and evidence becomes the next best action.

## Visual world

- Near-black lacquer and charcoal provide depth without large decorative gradients.
- Off-white carries nearly all content. Muted warm gray carries metadata.
- Dimensional champagne gold is reserved for action, current position, readiness, and success.
- Fine signal lines, route nodes, audio fields, and an abstract black-glass interviewer create the product’s own visual grammar.
- Surfaces are selective: one dominant canvas, supporting rails, and a small number of elevated controls.

## Approved references

- `.impeccable/mocks/landing-wayfinding.png`: landing and application-shell composition.
- `.impeccable/mocks/interview-chamber.png`: immersive mock-interview composition.

The generated copy and logos are not source assets. Implementation typography, content, spacing, and controls remain semantic, responsive code.

## Layout grammar

- Marketing: editorial split, then connected narrative sections; never a repeated card wall.
- Application shell: a dominant work surface plus contextual rail; metrics become inline instruments.
- Interview mode: reduced navigation, centered interviewer field, large question, quiet controls.
- Analysis: progressive disclosure—summary, answer evidence, then detailed speech/topic diagnostics.

## Gold discipline

Gold denotes:

1. the current step or selected state;
2. the primary action;
3. readiness/progress that the user earned;
4. a live signal or successful system state.

It does not decorate every border, icon, headline, or chart.

## Typography

Geist Sans is the primary family. Display type uses medium weight, tight tracking, and sentence case. Mono is limited to timers, dates, IDs, and technical measurements. No serif display type and no fake luxury letterspacing.

## Shape and depth

- Default radii: 8, 12, 16, and 24px (see [DESIGN.md](../DESIGN.md)'s `rounded` scale and
  `--radius-*` in [globals.css](../src/app/globals.css)); circles only for controls and scores.
- Most borders are neutral hairlines. Gold borders appear only on interactive/selected surfaces.
- Hover depth is 2–3px on meaningful large surfaces, never every row.
- Glass blur is constrained to navigation, modal, and floating control layers.

## Motion

- Product navigation: opacity + 4–8px translation + light blur, 180–320ms.
- Gold route indicators and progress rings draw once when revealed.
- The AI orb breathes and reacts to audio amplitude; it does not continuously spin.
- Pointer parallax is desktop-only, low amplitude, and limited to hero depth layers.
- Reduced motion removes parallax/particles and shortens transitions to near-instant fades.

## Responsive composition

- `≥1280px`: full split canvas and contextual rail.
- `1024–1279px`: narrower rail and compressed metrics.
- `768–1023px`: two-stage composition with horizontal instruments.
- `<768px`: task-first single viewport, bottom navigation, drawers for secondary detail.
- Interview mode on mobile prioritizes question, orb/waveform, timer, and answer controls; all diagnostics wait for the report.

## Accessibility floor

Visible gold/white focus ring, semantic landmarks, keyboard-complete dialogs/tabs/menus, 44px mobile targets, captions control, no color-only states, WCAG-compliant text contrast, and `prefers-reduced-motion` support.
