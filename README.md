# Abyuday Exam Workspace

A MERN exam platform with Gemini question generation, timed attempts, teams, invitations, and team admin reports.

## Features

- Register, sign in, or use Google OAuth. Authentication uses HTTP-only access and refresh cookies.
- Create personal tests or tests restricted to a team. Jobs are stored in MongoDB and processed by a RabbitMQ worker.
- Track queued, processing, ready, and failed tests. The dashboard refreshes status automatically.
- Choose Easy, Medium, or Hard; the API consistently maps these to ratings 2, 5, and 8, and accepts numeric difficulty from 0 to 10.
- Receive assessment generation alerts, invitation emails, and team updates. Manage generation and team email preferences in Settings.
- Retry failed assessments from the library or details page while keeping their ID and registered engines. Available to personal creators and team owners/admins.
- Take timed tests with server-side answer storage and scoring. Correct answers are returned only after an attempt ends.
- Create up to 10 teams, invite members or admins with a seven-day email-bound link, revoke invitations, change roles, transfer ownership, and review team results.
- View personal scoreboards, team rankings per assessment, score trends, answer breakdowns, and CSV exports.
- Use Light, Dark, or System appearance with desktop, tablet, and phone navigation.
- Review platform users, teams, assessments, and completed results in a protected central Admin area.
- Monitor overall and per-user Gemini usage, model and feature consumption, request performance, and team activity from the new monitoring tabs.

## Interactive assessments

Choose **Interactive** when creating an assessment to let a planner route questions to specialist authors and registered interaction engines. Students can change resistor circuits, adjust linear graphs, order steps, and sort items into categories alongside MCQs. When another interaction is needed, the builder automatically creates and registers a reusable workbench with controls and calculated readouts. Open **Engine library** to preview custom engines and inspect each question's engine requirements and build status. Responses save during the attempt and are graded on the server. Open **Interaction playground** to try built-in examples without AI calls.

See [architecture, supported engine limits, extension guide and next interaction ideas](docs/interactive-assessments.md). Interactive assessments support 1–20 questions with 1–10 minutes allocated per question type; existing multiple-choice tests keep their original behavior.

Assessment content supports LaTeX equations, syntax-highlighted code, Markdown tables/lists and semantic styling, with an editable formatting preview in **Interaction playground**. Rendering preserves original answer values for scoring.

## Requirements

- Node.js 22 or later for the recommended build and runtime
- MongoDB, RabbitMQ, and a Gemini API key
- Google OAuth credentials only if you want Google sign-in

## Local setup

1. Copy `.env.example` to `.env` and replace the example values. Generate different random values for the three JWT secrets.
2. Install dependencies:

   ```sh
   npm ci
   npm ci --prefix client
   ```

3. Start MongoDB and RabbitMQ, then build and run:

   ```sh
   npm run build
   npm start
   ```

4. Open `http://localhost:4040/`. `npm run startdev` restarts the API when server files change. For Vite hot reload, run `npm run dev --prefix client` in another terminal and open `http://localhost:5173/`.

The default `npm start` process also runs the task worker. For separate processes, set `RUN_WORKER=false` for the web process and run `npm run worker` separately.

Email delivery reuses the reference project's Gmail sender and Nodemailer layout.
Configure the mail settings in `.env.example` and see [email notifications](docs/email-notifications.md)
for events, recipients, retries, and deployment settings. Use the correct `APP_URL`
for links in emails; configure secrets separately in deployed environments.

For an isolated local stack, use `docker compose -f compose.dev.yml up --build` after creating `.env`. Stop any existing app on port 4040 first. This Compose file is for development; use authenticated managed databases and TLS for a public deployment.

## Platform admin setup

1. Register the account that will own platform administration.
2. Set `PLATFORM_OWNER_EMAIL` in the server environment to that existing account's email and restart the server.
3. Sign in with that account and open **Admin → Admin access**. Add admins by their existing account email.

The configured owner can grant or revoke platform admin access. Admins can read platform records; team owners and team admins have separate permissions. Revocation is checked on the next API request. Access changes appear in the audit history. Password hashes and authentication secrets are excluded from admin responses. A newly granted admin can refresh their workspace to show the Admin menu.

## Usage and activity monitoring

- **Admin → Usage & monitoring**: overall and per-user usage, AI request history, activity, API performance, and current API-process / worker statistics.
- **Teams → select a team → Usage & activity**: the same usage and activity views restricted to that team. Team owners and admins can access them; ordinary members cannot. Membership in multiple teams does not expose another team's data or personal account activity.
- **People → View activity** filters the summary and event lists to a person. Search and sorting are server-side, with paginated histories. **Export page** downloads the displayed people page as CSV.

Every outbound Gemini attempt is attributed to a user and, where applicable, a team and assessment. Question generation belongs to the creator; explanations belong to the requesting participant. SDK retries are disabled so worker retries are explicitly recorded as separate calls. Input, output, thinking, cached-input, tool-prompt, and total tokens come from Gemini's [`usageMetadata`](https://ai.google.dev/api/generate-content#UsageMetadata). Cached input is a subset of input and is not added again to the total. Invalid responses retain any reported consumption; provider errors with no counts are marked unreported. These counts describe this application's recorded requests, not the provider account's billing statement.

Recording begins when the updated server starts. Earlier token consumption cannot be reconstructed. AI usage records are retained; activity has a 90-day TTL and API requests a 30-day TTL, enforced by MongoDB indexes and read-window limits. Generation jobs remain available through the existing assessment records. Monitoring requests do not count toward product API traffic. Activity represents successful server actions and assessment loads, not unique browser visits or time spent on a page.

Telemetry includes timestamps, identifiers, event names, role changes, model, status codes, and duration. It excludes prompts, generated content, selected answers, passwords, cookies, full URLs, query strings, IP addresses, and user agents. Admin and team activity views resolve authorized user names and assessment titles for readability. Successful sign-in, registration, logout, profile/password updates, assessments, explanations, membership changes, and platform access changes are recorded.

A generation request is recorded before making the paid call. If its final telemetry update fails, the application does not repeat that call just to log it: the record remains unfinished and the process's monitoring write-failure counter increases. Worker state shows its last reported state and poll timestamp; a separate worker or stopped process may leave a stale report. Server memory and uptime describe the API process answering the request.

## API and operational checks

- `GET /health/live` confirms the HTTP process is running.
- `GET /health/ready` confirms MongoDB is reachable.
- `npm test` verifies authentication, teams, platform admin grants/revocations, scoring, analytics, and theme initialization. Integration tests use a temporary MongoDB database on `127.0.0.1:27017`.
- `npm run build` checks the client bundle.
- The worker requires a long-running process. A Vercel Function cannot host the RabbitMQ polling worker; deploy `worker.js` as a separate service if you deploy the API on Vercel. The former `vercel.json` was removed because it routed static files through Express, which Vercel does not serve. The provided Dockerfile supports a web service and a separate worker service.

## Before a public launch

Set `NODE_ENV=production`, serve the web app behind HTTPS, configure Google OAuth's callback URL for the deployed domain, and provide production MongoDB and RabbitMQ credentials. Review Gemini API quotas and costs for your account. Add application monitoring, backups, and an email delivery service if you want invitations sent automatically; the current admin UI creates a link to share manually.

The former `.env` file was tracked by Git. Removing it from the current index does not remove it from repository history. Rotate any real keys or secrets that were committed before publishing the repository.
