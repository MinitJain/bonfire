# Bonfire Product + UI Specification

## Core feeling

Bonfire should feel like sitting quietly with other people around a fire.

It should feel closer to a small game environment than a SaaS dashboard.

The user should immediately understand:

"I'm sitting here with other people, and we're focusing together."

---

# Home

## Composition

The viewport is mostly open space.

BONFIRE sits near the upper center.

Below it:

"a quiet place to focus together"

Small illustrated objects are distributed around the viewport:
books, notebooks, pencils, paper, mug, headphones.

Near the lower-middle area:

25 minutes

Then:

[start a bonfire] [join a bonfire]

Do not use:

- hero cards
- feature cards
- testimonials
- social proof
- pricing
- marketing sections
- dashboard panels

## Objects

Objects should be lightweight illustrations, not emoji.

They should have subtle ambient motion.

---

# Bonfire Room

## Core composition

The fire is the center of the screen.

Participants gather around it.

Example with five participants:

                 Minit
               character

       Arjun                  Noor
      character             character


                    FIRE


       Mira                  Sam
      character             character


                 24:38
                Focusing

                Pause ...

The exact positions can adapt,
but the visual principle must remain.

## Participant

Each participant has:

- character/avatar
- name above character
- intentional position around fire

A participant must NOT be represented as:

- a row of circles
- a dashboard card
- a sidebar list

## Participant states

Join:
character appears and gently moves into position.

Leave:
character gently fades / moves away.

Idle:
very subtle animation is acceptable.

Maximum:
6 participants.

---

# Bonfire name

The creator may optionally name the Bonfire, for example:
Deep Work, Late Night Focus, Morning Session.

- Optional, creator-only, max 40 characters, plain text.
- Chosen on the step after "start a bonfire", editable later by the
  creator in settings.
- Shown quietly at the top of the room, above the session configuration:

      Deep Work
      25 · 5 · 15

  (focus · short rest · long rest, in minutes; updates when settings change)

- If unnamed, only the configuration line is shown.
- Used in invitations: "Alex is inviting you to Deep Work".

The Bonfire name is the only title a Bonfire has.

---

# Fire

The fire is the primary visual anchor.

Warm orange.

Subtle animated flame.

Soft environmental warmth.

It must not look like:

- emoji
- giant glowing blob
- generic spinner
- decorative icon

---

# Timer

The timer is important, but the room comes first.

Primary state:

24:38
Focusing

Other states:

Short rest
Long rest

The timer should visually belong to the scene.

---

# Controls

Controls are secondary.

They should not look like a toolbar.

Prefer:
Pause
Skip
Step away

with calm visual treatment.

---

# Audio

Bonfire is silent by default.

No ambient sound or phase-end chime starts automatically. Sound begins only
after the participant explicitly enables it from the sound icon. The
phase-end chime is a separate toggle, off by default. A previous choice may
be remembered as a suggestion but never autoplays.

---

# Visual system

Environment:
soft blue / pale blue

Fire:
warm orange

Typography:
quiet, readable, modern

Spacing:
generous

Cards:
minimal

Borders:
minimal

Shadows:
soft

---

# Motion

Use motion only when it reinforces the environment:

- participant arrival
- participant departure
- fire idle
- subtle ambient object movement
- state transitions

No gimmicky effects.

Respect reduced-motion.

---

# Responsive

Desktop is the primary composition.

Mobile preserves:
fire as center
participants around fire
timer hierarchy
controls

Do not create a separate complicated mobile system.
