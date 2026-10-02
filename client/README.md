# Abyuday interface

The application uses React Router pages inside a shared workspace layout. Navigation, filtering, and team selection live in URLs so refresh, browser history, and shared links work predictably.

## Pages

| URL                                  | Purpose                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `/`                                  | Product introduction                                                              |
| `/login`, `/register`                | Account access; preserves the requested destination                               |
| `/dashboard`                         | Overview with real assessment and activity data                                   |
| `/dashboard/tests`                   | Assessment library with status, audience, search, pagination, and grid/list views |
| `/dashboard/create`                  | Single assessment form with optional advanced model settings                      |
| `/dashboard/take?testID=…`           | Preview an assessment before starting                                             |
| `/dashboard/results`                 | History, score analytics, personal scores, team rankings, and CSV export          |
| `/dashboard/admin`                   | Protected platform overview, users, assessments, teams, results, and admin access |
| `/dashboard/teams?team=…&tab=…`      | Members, invitations, and team results                                            |
| `/dashboard/settings?tab=appearance` | Profile, password, and Light / Dark / System settings                             |
| `/dashboard/help`                    | Workflow guidance and FAQs                                                        |
| `/test?testID=…`                     | Focused attempt and answer review                                                 |
| `/join?token=…`                      | Accept a team invitation                                                          |

## Structure

- `components/ui`: shared controls, page headings, status badges, empty/loading states, accessible native dialogs, and the app error boundary.
- `lib/api.js`: shared HTTP client, session expiry handling, dates, and clipboard utilities.
- `hooks/useResource.js`: cancellable reads and optional polling with loading and error states.
- `pages/Workspace.jsx`: persistent navigation, breadcrumbs, command search, mobile focus management, and user context.
- `pages/workspace`: independently loaded feature pages.
- `index.css`: design tokens and shared visual styles. Page styles live beside their layouts.
- `theme`: shared theme state; `public/theme-init.js` applies the saved theme before the first paint.
- `lib/results.js`: result normalization, weighted question accuracy, equal-weight attempt averages, and shared ranking rules.
- `components/UsageMonitor.jsx`: shared platform/team monitoring with overview, people, activity, AI requests, and API request views. Mounted under Admin's **Usage & monitoring** tab and Teams' **Usage & activity** tab.
- `lib/monitoring.js`: activity labels, time/number display, and explicit current-page CSV export.

The workspace uses a full sidebar on desktop, an icon rail on tablets, and bottom navigation plus a menu on phones. Tables become labeled cards on narrow screens.

Results use up to 100 recent attempts from the selected personal or team scope. Period filters apply within that window. Team rankings compare participants on one assessment; tied percentages share a rank. Platform admin tables use server pagination across the full dataset and restrict access independently of team membership.

Use existing shared components when adding a feature. Keep server data authoritative, provide explicit empty and failure states, and place navigation state in the URL. Assessment drafts persist in the current browser tab until submitted. The command menu opens with Ctrl/Cmd + K.

## Development

Run the API on port 4040, then `npm run dev` from this directory. Vite forwards `/api` and `/auth` to the API. `npm run build` creates assets served by Express. The root integration test covers team access, queued-test visibility, scoring, and private results history.

Older inactive pages and components remain in the repository to preserve prior work; new routes are defined in `src/App.jsx`.
