export const activityLabels = {
  "auth.login": "Signed in",
  "auth.register": "Created an account",
  "auth.logout": "Signed out",
  "profile.updated": "Updated profile",
  "password.changed": "Changed password",
  "assessment.created": "Created assessment",
  "assessment.viewed": "Viewed assessment",
  "generation.started": "Generation started",
  "generation.completed": "Generation completed",
  "generation.failed": "Generation failed",
  "generation.requeued": "Generation queued for retry",
  "attempt.started": "Started assessment",
  "attempt.resumed": "Resumed assessment",
  "attempt.reviewed": "Reviewed answers",
  "attempt.completed": "Completed assessment",
  "answers.saved": "Saved answers",
  "explanation.generated": "Generated explanation",
  "team.created": "Created team",
  "team.joined": "Joined team",
  "team.left": "Left team",
  "invite.created": "Created invitation",
  "invite.revoked": "Revoked invitation",
  "member.role_changed": "Changed member role",
  "member.removed": "Removed member",
  "team.ownership_transferred": "Transferred team ownership",
  "results.viewed": "Viewed team results",
  "platform.admin_granted": "Granted platform admin access",
  "platform.admin_revoked": "Removed platform admin access",
};
export const number = (value) => Number(value || 0).toLocaleString();
export const tokenTotal = (row) =>
  row?.calls > 0 && !row.measuredCalls ? "—" : number(row?.totalTokens);
export const duration = (ms) =>
  ms == null
    ? "—"
    : ms < 1000
      ? `${Math.round(ms)} ms`
      : `${(ms / 1000).toFixed(1)} s`;
export const timestamp = (value) =>
  value && Number.isFinite(new Date(value).getTime())
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
export function downloadUsage(rows) {
  const escape = (value) =>
    `"${String(value ?? "")
      .replace(/^[\s]*[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`;
  const columns = [
    [
      "Name",
      "Email",
      "Reported tokens",
      "AI calls",
      "Calls with token totals",
      "Failed AI calls",
      "API requests",
      "API errors",
      "Assessments started",
      "Assessments completed",
      "Last activity",
    ],
    ...rows.map((row) => [
      row.name,
      row.email,
      row.ai.measuredCalls ? row.ai.totalTokens : row.ai.calls ? "" : 0,
      row.ai.calls || 0,
      row.ai.measuredCalls || 0,
      row.ai.failed || 0,
      row.api.requests || 0,
      row.api.errors || 0,
      row.activity.started || 0,
      row.activity.completed || 0,
      row.activity.lastAt || "",
    ]),
  ];
  const url = URL.createObjectURL(
    new Blob(
      ["\uFEFF" + columns.map((row) => row.map(escape).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    ),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "usage-current-page.csv";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
