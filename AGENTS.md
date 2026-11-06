# Rules for discourse-tag-description-tooltip

The global rules of the user apply. This file adds the rules of this project. This project has no `CLAUDE.md`.

## What to read first

- `.plan/PLAN.md` (private plan repository, cloned into the ignored `.plan/`): the hand-off and the open steps.
- `README.md`: what the component does and how to install it.

## Domain

Purpose: a Discourse theme component that shows the description of a tag in a tooltip when the user hovers over or focuses the tag.
Owns: this repository and its plan.
Does not own: Discourse core and the forums that install it.
Delegator: the user.

## Rules

- This repository is public. It names no forum, no local path, and no private context. Forum-specific notes go into `.plan/`. {#public-no-forum}
- The project runs without the factory: no Severin loop. It uses mise and git with `main` as the trunk and a push after each commit. {#no-factory}
- Use the current plugin API of Discourse, patch no core code, and never put back the `title` attribute that core removed for accessibility. {#current-discourse-api}
