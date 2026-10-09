# Email notifications

The Gmail/Nodemailer transport and table email layout are adapted from
[the reference Abyuday project](https://github.com/Vivekindev/Abyuday_Multi_LLM_Platform/blob/master/functions/emailing/otpauth.js).
The same sender is configured in the ignored local `.env`. Credentials are never
stored in the source files or client bundle.

## Configuration

Set `EMAIL_ENABLED=true`, `SMTP_SERVICE=gmail`, `SMTP_USER`, `SMTP_PASS`,
`SMTP_FROM`, and `APP_URL` in the server environment. Gmail requires an app
password or another supported authentication method. `APP_URL` is the public
origin of this application, used for assessment and invitation links. For Vite
development, set it to `http://localhost:5173`; the built app uses port 4040.
Production delivery requires `APP_URL` or `CLIENT_ORIGIN`; request Host headers
are never used to build email links.

An alternative SMTP provider can use `SMTP_HOST`, `SMTP_PORT`, and
`SMTP_SECURE`. Preserve the normal TLS certificate checks.

The reference file contains credentials in its source. Rotate the Gmail app
password and keep its replacement in local or deployment secrets.

## Events and recipients

| Event | Recipients |
| --- | --- |
| Personal assessment ready or failed | Creator |
| Team assessment ready | Creator and current team members |
| Team assessment generation failed | Creator and current owners/admins |
| Invitation created | Invited email, including people without accounts |
| Invitation accepted | Joining member and team owners/admins |
| Assessment requested | Team owners/admins except the requester |
| Request accepted, completed, or declined | Requester |
| Member role changed | Affected member |
| Member leaves or is removed | Current owners/admins; removed member receives a separate notice |
| Ownership transferred or team deleted | Other team members |
| Password changed | Account holder |

Users can disable generation and team emails in **Settings → Notifications**.
Invitations and security messages are transactional and remain enabled.
Answer saves, page views, and ordinary test activity do not generate emails.

## Delivery

MongoDB stores an outbox entry per event and recipient. Content is encrypted
with AES-GCM; set `EMAIL_ENCRYPTION_KEY` for an independent key, or a key is
derived from `TEST_TOKEN_SECRET`. Keep the key stable while messages are
pending. Sent or cancelled entries have their content removed. Outbox records
expire after 30 days.

The web process and `npm run worker` start a mail worker. Set
`RUN_MAIL_WORKER=false` on processes that should not deliver mail. Atomic leases
allow multiple processes to share the outbox. Delivery retries up to six times
with increasing delays. SMTP errors do not fail generation or team actions.
Invitations display queued, sending, sent, retrying, failed, or disabled status.
"Sent" means SMTP accepted the email; it does not guarantee inbox delivery.

After creating an invitation, the dialog follows its delivery status while it
is open. Queued/sending messages refresh every five seconds; other states
refresh every fifteen seconds, and delayed messages show the next retry time. A confirmation
appears once sending succeeds. Closing the dialog does not stop delivery.
The Invitations tab continues to show delivery status and updates automatically.
Copying a link confirms the copy and offers manual selection if clipboard
access is unavailable. Accepted, expired, or revoked invitations cannot be
copied from the status dialog.

All notifications share a responsive table layout: a short heading, concise
message, compact context, and one primary action. HTML uses readable fallback
link text; the plain-text version retains the complete URL. Optional inbox
previews and notes are escaped just like other user content. Invitation and
security emails omit the preferences link because those messages are always
transactional. Older queued messages still work with the shared template.

Generation notifications reconcile after a crash. Duplicate generation event
records are suppressed by their assessment, generation attempt, and recipient.
SMTP cannot promise exactly-once delivery if a process stops after sending but
before recording success; deterministic Message-IDs help mail clients recognize
such redeliveries.

Before sending, the worker checks preferences, current membership, assessment
status, and invitation validity. Revoked/accepted invitations and deleted teams
or assessments cancel pending mail. An SMTP send already in flight cannot be
recalled. Raw invitation links are never exposed by the invitation list API.

Tests use an injected mock sender; they never send mail to real recipients.
