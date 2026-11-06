# Tag Description Tooltip

A Discourse theme component. When you move the mouse over a tag, or move the keyboard focus to it, a tooltip shows the description of the tag.

Discourse removed the `title` attribute from tag links in July 2026, because a `title` is not reachable by keyboard or touch, and screen readers read it on each tag. This component does not put the `title` back. It uses the float-kit tooltip of Discourse, which also opens on keyboard focus.

## Install

1. In the admin panel, open Appearance, then Themes and components, then Components.
2. Click Install, then From a git repository, and enter `https://github.com/thoka/discourse-tag-description-tooltip`.
3. On the page of the component, click "Add all themes" (German: "Alle Themes hinzufügen") and save. A user can pick any theme in their preferences, so the component must be in each theme; a theme without it shows no tooltip.
4. After an update of the component, click "Check for updates" on the same page.

Or, with an admin API key (global scope) in a file: `bin/install-on-forum <forum base URL> <key file> [--dry-run]`. It installs or updates the component, turns it on, adds it to each theme, and checks the result. It is safe to run again.

It needs Discourse 2026.10 or later.

## Settings

- `enable_fallback_fetch` (on by default): some places show a tag without its description, for example the sidebar and the tag chooser. For such a tag, the component loads the description from `/tag/<name>/info.json`. It loads each tag once per page load.
- `full_description_on_hover` (off by default): the topic list sends only the first 80 characters of a description. With this setting, the component always loads the full text from the server.

The tooltip shows the description as plain text. It removes HTML tags and does not render Markdown or links.

## Known gaps

- Desktop only. On a phone or a touch-first device, a tap on a tag opens the tag page, so the component shows no tooltip there.
- Discourse has one tag renderer at a time. This component replaces it with `api.replaceTagRenderer`. If another component also replaces it, only one of them works.

## Development

The tests run in a Discourse dev container that mounts the parent folder of this checkout at `/workspace`, with core at `/workspace/discourse`. The container needs a running Postgres, Chromium, and a core frontend build (`pnpm build`).

- `mise run test`: lint, then the QUnit tests.
- `bin/test-qunit`: imports this checkout as a theme into the test database and runs its QUnit tests with core's `bin/qunit`.
- `bin/lint [--fix]`: ESLint and Prettier with the configs of core.

If more than one dev container runs, set `DISCOURSE_DEV_CONTAINER` to its name.
