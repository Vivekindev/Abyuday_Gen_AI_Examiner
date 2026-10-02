import { useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import {
  FiCopy,
  FiMail,
  FiPlus,
  FiShield,
  FiTrash2,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { toast } from "sonner";
import {
  Avatar,
  Button,
  EmptyState,
  ErrorNotice,
  LoadingState,
  Modal,
  PageHeading,
} from "../components/ui";
import { api, copyText, errorMessage, formatDate } from "../lib/api";
import useResource from "../hooks/useResource";
import UsageMonitor from "../components/UsageMonitor";

export default function TeamsManager() {
  const { me } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const teams = useResource("/teams");
  const selectedId = teams.data?.some((team) => team.id === params.get("team"))
    ? params.get("team")
    : teams.data?.[0]?.id;
  const details = useResource(selectedId ? `/teams/${selectedId}` : null);
  const team = details.data;
  const canManage = team && ["owner", "admin"].includes(team.role);
  const requestedTab = params.get("tab");
  const tab =
    canManage && ["invitations", "results", "activity"].includes(requestedTab)
      ? requestedTab
      : "members";
  const invites = useResource(
    canManage && tab === "invitations" ? `/teams/${selectedId}/invites` : null,
  );
  const results = useResource(
    canManage && tab === "results" ? `/teams/${selectedId}/results` : null,
  );
  const [dialog, setDialog] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [inviteLink, setInviteLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const changeTab = (next) => setParams({ team: selectedId, tab: next });
  const openDialog = (value) => {
    setError("");
    setInviteLink("");
    setDialog(value);
  };
  const closeDialog = () => {
    if (!busy) {
      setDialog(null);
      setError("");
    }
  };
  const createTeam = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/teams", { name: name.trim() });
      teams.reload();
      setParams({ team: data.id });
      setName("");
      setDialog(null);
      toast.success("Your team is ready", {
        description: "Invite your first teammate to get started.",
      });
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  const invite = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`/teams/${selectedId}/invites`, {
        email,
        role,
      });
      setInviteLink(`${window.location.origin}/join?token=${data.token}`);
      invites.reload();
      toast.success("Invitation created");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  const updateRole = async (member, nextRole) => {
    setBusy(true);
    try {
      await api.patch(`/teams/${selectedId}/members/${member.id}`, {
        role: nextRole,
      });
      details.reload();
      toast.success(
        `${member.name || "Member"} is now an ${nextRole === "admin" ? "admin" : "assessment member"}`,
      );
    } catch (requestError) {
      toast.error(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  const confirmAction = async () => {
    setBusy(true);
    setError("");
    try {
      if (dialog.type === "remove") {
        await api.delete(`/teams/${selectedId}/members/${dialog.member.id}`);
        if (dialog.member.id === me?.id) setParams({});
        teams.reload();
        details.reload();
        toast.success("Team membership updated");
      } else if (dialog.type === "transfer") {
        await api.post(`/teams/${selectedId}/transfer`, {
          userId: dialog.member.id,
        });
        teams.reload();
        details.reload();
        toast.success("Ownership transferred");
      } else if (dialog.type === "revoke") {
        await api.delete(`/teams/${selectedId}/invites/${dialog.invite.id}`);
        invites.reload();
        toast.success("Invitation revoked");
      }
      setDialog(null);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await copyText(inviteLink);
      toast.success("Invitation link copied");
    } catch (copyError) {
      toast.error(copyError.message);
    }
  };
  const dialogTitle =
    dialog?.type === "create"
      ? "A shared space for your people"
      : dialog?.type === "invite"
        ? "Invite someone to your team"
        : dialog?.type === "transfer"
          ? "Transfer team ownership?"
          : dialog?.type === "revoke"
            ? "Revoke this invitation?"
            : "Remove this team member?";
  return (
    <div className="route-transition">
      <PageHeading title="Teams & people">
        <Button icon={FiPlus} onClick={() => openDialog({ type: "create" })}>
          Create a team
        </Button>
      </PageHeading>
      <ErrorNotice message={teams.error} onRetry={teams.reload} />
      {teams.loading ? (
        <section className="panel">
          <LoadingState />
        </section>
      ) : teams.data?.length ? (
        <div className="team-grid">
          <aside className="panel team-directory">
            <h2>Your teams · {teams.data.length}</h2>
            {teams.data.map((item) => (
              <Link
                key={item.id}
                className={selectedId === item.id ? "active" : ""}
                to={`/dashboard/teams?team=${item.id}`}
              >
                <span className="team-initial">
                  {item.name[0].toUpperCase()}
                </span>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.memberCount}{" "}
                    {item.memberCount === 1 ? "member" : "members"} ·{" "}
                    {item.role}
                  </small>
                </span>
              </Link>
            ))}
            <Button
              variant="ghost"
              className="btn-block btn-sm"
              icon={FiPlus}
              onClick={() => openDialog({ type: "create" })}
            >
              Create another team
            </Button>
          </aside>
          <div>
            <ErrorNotice message={details.error} onRetry={details.reload} />
            {details.loading ? (
              <section className="panel">
                <LoadingState />
              </section>
            ) : (
              team && (
                <section className="panel">
                  <div className="team-header">
                    <div className="team-identity">
                      <span>
                        <FiUsers />
                      </span>
                      <div>
                        <h2>{team.name}</h2>
                        <p>
                          {team.members.length}{" "}
                          {team.members.length === 1 ? "member" : "members"}{" "}
                          <span style={{ margin: "0 6px" }}>·</span>{" "}
                          <span className="role-badge">{team.role}</span>
                        </p>
                      </div>
                    </div>
                    {canManage && (
                      <Button
                        icon={FiUserPlus}
                        onClick={() => openDialog({ type: "invite" })}
                      >
                        Invite people
                      </Button>
                    )}
                  </div>
                  <div className="team-content-tabs">
                    <nav className="tabs" aria-label="Team sections">
                      <button
                        className={tab === "members" ? "active" : ""}
                        onClick={() => changeTab("members")}
                      >
                        Members
                        <span className="tab-count">{team.members.length}</span>
                      </button>
                      {canManage && (
                        <>
                          <button
                            className={tab === "invitations" ? "active" : ""}
                            onClick={() => changeTab("invitations")}
                          >
                            Invitations
                          </button>
                          <button
                            className={tab === "results" ? "active" : ""}
                            onClick={() => changeTab("results")}
                          >
                            Results
                          </button>
                          <button
                            className={tab === "activity" ? "active" : ""}
                            onClick={() => changeTab("activity")}
                          >
                            Usage & activity
                          </button>
                        </>
                      )}
                    </nav>
                  </div>
                  {tab === "activity" && canManage && (
                    <div className="team-monitoring">
                      <UsageMonitor key={selectedId} teamId={selectedId} />
                    </div>
                  )}
                  {tab === "members" && (
                    <div className="table-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Person</th>
                            <th>Role</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {team.members.map((member) => (
                            <tr key={member.id}>
                              <td>
                                <div className="table-person">
                                  <Avatar name={member.name || member.email} />
                                  <div>
                                    <span className="table-title">
                                      {member.name || member.email}{" "}
                                      {member.id === me?.id && (
                                        <span className="soft-tag">You</span>
                                      )}
                                    </span>
                                    <span className="table-subtitle">
                                      {member.email}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td data-label="Role">
                                {team.role === "owner" &&
                                member.role !== "owner" ? (
                                  <div className="team-member-controls">
                                    <select
                                      value={member.role}
                                      disabled={busy}
                                      onChange={(event) =>
                                        updateRole(member, event.target.value)
                                      }
                                      aria-label={`Role for ${member.name}`}
                                    >
                                      <option value="member">Member</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                  </div>
                                ) : (
                                  <span className="role-badge">
                                    {member.role === "owner" && <FiShield />}
                                    {member.role}
                                  </span>
                                )}
                              </td>
                              <td data-label="Actions">
                                <div className="table-actions">
                                  {member.role !== "owner" &&
                                    (canManage || member.id === me?.id) && (
                                      <button
                                        className="icon-button text-danger"
                                        onClick={() =>
                                          openDialog({ type: "remove", member })
                                        }
                                        aria-label={
                                          member.id === me?.id
                                            ? "Leave team"
                                            : `Remove ${member.name}`
                                        }
                                        title={
                                          member.id === me?.id
                                            ? "Leave team"
                                            : "Remove member"
                                        }
                                      >
                                        <FiTrash2 />
                                      </button>
                                    )}
                                  {team.role === "owner" &&
                                    member.role !== "owner" && (
                                      <Button
                                        variant="ghost"
                                        className="btn-sm"
                                        onClick={() =>
                                          openDialog({
                                            type: "transfer",
                                            member,
                                          })
                                        }
                                      >
                                        Make owner
                                      </Button>
                                    )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {tab === "invitations" && (
                    <>
                      <ErrorNotice
                        message={invites.error}
                        onRetry={invites.reload}
                      />
                      {invites.loading ? (
                        <LoadingState />
                      ) : invites.data?.length ? (
                        <div className="table-scroll">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Invited person</th>
                                <th>Role</th>
                                <th>Expires</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invites.data.map((item) => (
                                <tr key={item.id}>
                                  <td>
                                    <div className="table-person">
                                      <span className="avatar">
                                        <FiMail />
                                      </span>
                                      <span className="table-title">
                                        {item.email}
                                      </span>
                                    </div>
                                  </td>
                                  <td data-label="Role">
                                    <span className="role-badge">
                                      {item.role}
                                    </span>
                                  </td>
                                  <td data-label="Expires">
                                    {formatDate(item.expiresAt)}
                                  </td>
                                  <td data-label="Action">
                                    <Button
                                      variant="ghost"
                                      className="btn-sm text-danger"
                                      onClick={() =>
                                        openDialog({
                                          type: "revoke",
                                          invite: item,
                                        })
                                      }
                                    >
                                      Revoke
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        !invites.error && (
                          <EmptyState
                            icon={FiMail}
                            title="No pending invitations"
                            description="Invite a member using their account email."
                          >
                            <Button
                              icon={FiUserPlus}
                              onClick={() => openDialog({ type: "invite" })}
                            >
                              Invite someone
                            </Button>
                          </EmptyState>
                        )
                      )}
                    </>
                  )}
                  {tab === "results" && (
                    <>
                      <ErrorNotice
                        message={results.error}
                        onRetry={results.reload}
                      />
                      {results.loading ? (
                        <LoadingState />
                      ) : results.data?.length ? (
                        <div className="table-scroll">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Person</th>
                                <th>Assessment</th>
                                <th>Score</th>
                                <th>Completed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.data.map((attempt) => (
                                <tr key={attempt.id}>
                                  <td>
                                    <div className="table-person">
                                      <Avatar name={attempt.name} />
                                      <div>
                                        <strong className="table-title">
                                          {attempt.name}
                                        </strong>
                                        <span className="table-subtitle">
                                          {attempt.email}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td data-label="Assessment">
                                    {attempt.testName}
                                  </td>
                                  <td data-label="Score">
                                    <div className="result-score">
                                      <strong>{attempt.percentage}%</strong>
                                      <span className="score-track">
                                        <i
                                          style={{
                                            width: `${attempt.percentage}%`,
                                          }}
                                        />
                                      </span>
                                      <small>
                                        {attempt.score}/{attempt.total}
                                      </small>
                                    </div>
                                  </td>
                                  <td data-label="Completed">
                                    {formatDate(attempt.finishedAt)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        !results.error && (
                          <EmptyState
                            icon={FiBookResults}
                            title="Your team’s progress will appear here"
                            description="Create a team assessment and share it. Completed attempts will be visible to owners and admins."
                          >
                            <Button to="/dashboard/create" icon={FiPlus}>
                              Create assessment
                            </Button>
                          </EmptyState>
                        )
                      )}
                    </>
                  )}
                  <div className="table-footer">
                    <span>
                      {tab === "results"
                        ? "Latest 100 completed team attempts"
                        : `${team.members.length} members`}
                    </span>
                    <Link
                      to={
                        tab === "results"
                          ? `/dashboard/results?team=${team.id}&tab=scoreboard`
                          : "/dashboard/help"
                      }
                      className="text-link"
                    >
                      {tab === "results"
                        ? "Scoreboard & analytics"
                        : "About team roles"}
                    </Link>
                  </div>
                </section>
              )
            )}
          </div>
        </div>
      ) : (
        !teams.error && (
          <section className="panel">
            <EmptyState
              icon={FiUsers}
              title="Good things happen together"
              description="Create a team to share assessments, invite collaborators, and follow everyone’s progress."
            >
              <Button
                icon={FiPlus}
                onClick={() => openDialog({ type: "create" })}
              >
                Create your first team
              </Button>
            </EmptyState>
          </section>
        )
      )}
      <Modal
        open={!!dialog}
        onClose={closeDialog}
        title={dialogTitle}
        description={
          dialog?.type === "create"
            ? "Choose a name your teammates will recognize."
            : dialog?.type === "invite"
              ? `Invite a member or admin to ${team?.name || "your team"}.`
              : undefined
        }
      >
        <ErrorNotice message={error} />
        {dialog?.type === "create" && (
          <form className="form-stack" onSubmit={createTeam}>
            <label className="field">
              Team name
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={80}
                required
                placeholder="e.g. Product & Engineering"
              />
            </label>
            <div className="form-actions">
              <Button variant="secondary" onClick={closeDialog} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy} icon={FiPlus}>
                {busy ? "Creating…" : "Create team"}
              </Button>
            </div>
          </form>
        )}
        {dialog?.type === "invite" &&
          (inviteLink ? (
            <>
              <div className="notice notice-success">
                <FiMail />
                <span>
                  Your invitation is ready. Share this link with{" "}
                  <strong>{email}</strong>.
                </span>
              </div>
              <div className="inline-copy">
                <input
                  className="input"
                  value={inviteLink}
                  readOnly
                  aria-label="Invitation link"
                  onFocus={(event) => event.target.select()}
                />
                <Button icon={FiCopy} onClick={copy}>
                  Copy
                </Button>
              </div>
              <p className="invite-guide">
                This link expires in 7 days. The recipient must sign in with the
                invited email address. Invitations are shared manually.
              </p>
              <div className="form-actions" style={{ marginTop: 20 }}>
                <Button onClick={closeDialog}>Done</Button>
              </div>
            </>
          ) : (
            <form className="form-stack" onSubmit={invite}>
              <label className="field">
                Email address
                <input
                  autoFocus
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  required
                  placeholder="teammate@example.com"
                />
              </label>
              <label className="field">
                Team role
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                >
                  <option value="member">Member — take team assessments</option>
                  <option value="admin">
                    Admin — manage assessments and people
                  </option>
                </select>
              </label>
              <p className="field-hint">
                We’ll create a private invitation link for you to share.
              </p>
              <div className="form-actions">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={closeDialog}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy} icon={FiUserPlus}>
                  {busy ? "Creating…" : "Create invitation"}
                </Button>
              </div>
            </form>
          ))}
        {dialog && ["remove", "transfer", "revoke"].includes(dialog.type) && (
          <>
            <p className="muted">
              {dialog.type === "transfer"
                ? `${dialog.member.name || dialog.member.email} will become the owner of ${team?.name}. You will become an admin.`
                : dialog.type === "revoke"
                  ? `The invitation for ${dialog.invite.email} will stop working immediately.`
                  : `${dialog.member.name || dialog.member.email} will lose access to this team and its assessments. An admin can invite them again later.`}
            </p>
            <div className="form-actions">
              <Button variant="secondary" onClick={closeDialog} disabled={busy}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmAction} disabled={busy}>
                {busy
                  ? "Updating…"
                  : dialog.type === "transfer"
                    ? "Transfer ownership"
                    : dialog.type === "revoke"
                      ? "Revoke invitation"
                      : "Remove member"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
function FiBookResults() {
  return <FiShield />;
}
