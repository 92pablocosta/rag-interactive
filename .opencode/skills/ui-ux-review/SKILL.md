---
name: ui-ux-review
description: Review and guide UI/UX decisions for RAG Interactive, focusing on clarity, hierarchy, interaction quality, accessibility, responsive behavior, and educational usability.
compatibility: opencode
metadata:
  scope: ui-ux
  project: rag-interactive
---

# UI/UX Review

Use this skill for UI, UX, interaction, layout, responsive, and usability work in RAG Interactive.

The goal is not merely to make the interface look better.

The goal is to make the product easier to understand, navigate, learn from, and use.

## Review priorities

Evaluate in this order:

1. clarity
2. learning flow
3. information hierarchy
4. interaction feedback
5. accessibility
6. responsive behavior
7. consistency
8. visual polish

Do not prioritize decoration over comprehension.

## Educational UX

For every major section, ask:

- What is the learner supposed to understand here?
- Is that concept visually obvious?
- Is the relationship between cause and effect visible?
- Does the interaction teach something or merely animate something?
- Is the next step clear?
- Is too much information presented at once?

Prefer progressive disclosure over dumping everything on screen.

## Interaction quality

Interactive elements should have a clear purpose.

A useful interaction should generally follow:

ACTION
→ SYSTEM RESPONSE
→ VISIBLE CONSEQUENCE
→ CONCEPT LEARNED

Avoid interactions that exist only for novelty.

Make states clear:

- default
- hover
- focus
- active
- selected
- disabled
- error
- loading

## Information hierarchy

Check:

- headings
- section boundaries
- spacing
- grouping
- reading order
- visual emphasis
- primary vs secondary information
- code vs explanation vs visualization

Important concepts should be visually easier to find than supporting details.

Avoid interfaces where every element competes for attention.

## Layout

Preserve the guided vertical learning experience unless there is a strong reason not to.

Avoid turning Learn into:

- a dashboard
- a dense control panel
- a grid of unrelated cards

Sections should feel connected as part of one learning journey.

## Responsive behavior

Review at least:

- desktop
- tablet
- mobile

Check for:

- overflow
- cramped layouts
- unreadable text
- broken diagrams
- inaccessible controls
- excessive horizontal scrolling
- interactions that depend only on hover

Do not treat mobile as a compressed desktop layout.

## Accessibility

Check relevant:

- semantic HTML
- heading structure
- labels
- keyboard navigation
- focus visibility
- contrast
- button/link semantics
- ARIA only when necessary
- reduced-motion considerations
- readable touch targets

Accessibility fixes should preserve usability, not merely satisfy a checklist.

## Visual consistency

Evaluate consistency in:

- spacing
- typography
- border radius
- icons
- illustration style
- component behavior
- colors
- states
- section structure

Do not redesign existing patterns without a concrete reason.

## Review behavior

When reviewing UI/UX:

Distinguish:

- usability problem
- accessibility problem
- visual inconsistency
- subjective preference

Do not report personal taste as an objective defect.

For each meaningful issue provide:

- location
- problem
- why it matters
- recommended change

Prioritize findings as:

- P1 — blocks understanding or use
- P2 — meaningfully harms UX
- P3 — polish or consistency improvement