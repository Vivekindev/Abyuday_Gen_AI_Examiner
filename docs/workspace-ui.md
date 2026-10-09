# Workspace UI conventions

The shared design values live in `client/src/index.css`. Workspace layout lives
in `client/src/pages/workspace.css`; page styles should stay scoped to their
own components.

## Structure

- Use `PageHeading` for the page title, a short description, and page actions.
- Use `SectionHeading` for sections outside cards. Give its `id` to the parent
  section's `aria-labelledby` when appropriate.
- Use `panel`, `panel-heading`, and `panel-padding` for cards with a heading and
  content. Use `table-footer` for pagination.
- Keep form content at a readable width without narrowing the page heading.
- Use `EmptyState`, `ErrorNotice`, and `LoadingState` for shared feedback.

## Visual values

- Use semantic colors (`--ink`, `--muted`, `--surface`, `--link`, and status
  colors) so light and dark themes stay consistent.
- Use `--radius-control` for controls, `--radius` for cards, and
  `--radius-overlay` for dialogs.
- Use `--panel-padding` for card content and `--page-gutter` for page edges.
  Mobile values are defined with the shared tokens.
- Use the shared title and section text sizes. Keep metadata quieter than
  titles and actions; reserve status colors for meaningful states.

## Controls and responsive layouts

- Use `Button` variants for action priority. Start, Resume, Submit, and the main
  page action should remain easy to identify. Use secondary or ghost variants
  for supporting actions and the danger variant for destructive confirmation.
- Keep controls at least 44px tall. Give icon-only controls an accessible name.
- Use visible labels, keyboard focus indicators, and selected state attributes.
- Let action rows wrap and give grid children `min-width: 0`. Keep card actions
  at the bottom when cards share a row.
- Mobile tables use labeled cells and a full-width action row. Use
  `data-label="Action"` or `data-label="Actions"` for that row.
- Avoid generic selectors in page styles that override shared buttons,
  pagination, tables, or tabs after navigation.
