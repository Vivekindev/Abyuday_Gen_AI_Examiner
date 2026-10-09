import { useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import {
  FiClipboard,
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
import { api, errorMessage, formatDate } from "../lib/api";
import useResource from "../hooks/useResource";
import UsageMonitor from "../components/UsageMonitor";
import EmailDeliveryStatus from '../components/EmailDeliveryStatus';
import InvitationReceipt from '../components/InvitationReceipt';
import { DIFFICULTY_OPTIONS, difficultyLabel, difficultyRating } from '../../../shared/difficulty.js';

export default function TeamsManager() {
  const { me } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const teams = useResource("/teams");
  const selectedId = teams.data?.some((team) => team.id === params.get("team"))
    ? params.get("team")
    : teams.data?.[0]?.id;
  const details = useResource(selectedId ? `/teams/${selectedId}` : null);
  const team = details.data;
  const canManage = team && !team.deleting && ["owner", "admin"].includes(team.role);
  const requestedTab = params.get("tab");
  const tab =
    (!team?.deleting && ["requests"].includes(requestedTab)) || (canManage && ["invitations", "results", "activity"].includes(requestedTab))
      ? requestedTab
      : "members";
  const invites = useResource(
    canManage && tab === "invitations" ? `/teams/${selectedId}/invites` : null,
    { interval: 10000 },
  );
  const results = useResource(
    canManage && tab === "results" ? `/teams/${selectedId}/results` : null,
  );
  const requests = useResource(
    selectedId && tab === "requests" ? `/teams/${selectedId}/assessment-requests` : null,
  );
  const [dialog, setDialog] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [createdInvitation, setCreatedInvitation] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestTopic, setRequestTopic] = useState("");
  const [requestCount, setRequestCount] = useState(10);
  const [requestDifficulty, setRequestDifficulty] = useState('medium');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const changeTab = (next) => setParams({ team: selectedId, tab: next });
  const openDialog = (value) => {
    setError("");
    setCreatedInvitation(null);
    setDeleteConfirmation('');
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
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`/teams/${selectedId}/invites`, {
        email,
        role,
      });
      setCreatedInvitation({
        id: data.id, teamId: selectedId, email: data.email || email.trim().toLowerCase(),
        link: `${window.location.origin}/join?token=${data.token}`,
        expiresAt: data.expiresAt, emailStatus: data.emailStatus || 'not_sent',
      });
      invites.reload();
      if (data.emailStatus === 'queued') {
        toast.success('Invitation created', { description: 'The email is queued. We’ll update its status here.' });
      } else {
        toast.info('Invitation link ready', { description: 'Email delivery is unavailable. Copy the link to share it directly.' });
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  const submitAssessmentRequest = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post(`/teams/${selectedId}/assessment-requests`, {
        title: requestTitle, topic: requestTopic,
        questionCount: Number(requestCount), difficulty: difficultyRating(requestDifficulty),
      });
      setRequestTitle("");
      setRequestTopic("");
      requests.reload();
      toast.success('Assessment request submitted', { description: 'Your team admins can review it in Requests.' });
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  const updateRequest = async (item, status) => {
    setBusy(true);
    try {
      await api.patch(`/teams/${selectedId}/assessment-requests/${item.id}`, { status });
      requests.reload();
      toast.success(status === "fulfilled" ? "Request marked complete" : status === "declined" ? "Request declined" : "Request accepted");
    } catch (requestError) {
      toast.error(errorMessage(requestError));
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
  const removeTeam = async (event) => {
    event.preventDefault();
    if (busy || dialog?.type !== 'delete-team' || deleteConfirmation !== dialog.team.name) return;
    const target = dialog.team;
    setBusy(true);
    setError('');
    try {
      await api.delete(`/teams/${encodeURIComponent(target.id)}`, { data: { confirmationName: deleteConfirmation } });
      const remaining = (teams.data || []).filter((item) => item.id !== target.id);
      teams.setData(remaining);
      if (selectedId === target.id) setParams(remaining.length ? { team: remaining[0].id } : {}, { replace: true });
      teams.reload();
      setDialog(null);
      setDeleteConfirmation('');
      toast.success(`${target.name} deleted`);
      requestAnimationFrame(() => document.getElementById('create-team-button')?.focus());
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not finish deleting the team. Please retry.'));
      if (requestError.response?.status === 404) teams.reload();
      details.reload();
    } finally {
      setBusy(false);
    }
  };
  const dialogTitle =
    ({
      'delete-team': 'Delete this team?',
      create: 'A shared space for your people',
      invite: createdInvitation ? 'Invitation status' : 'Invite someone to your team',
      transfer: 'Transfer team ownership?',
      revoke: 'Revoke this invitation?',
      remove: 'Remove this team member?',
    })[dialog?.type] || '';
  return (
    <div className="route-transition">
      <PageHeading title="Teams & people" description="Manage your teams, shared assessments, and member access.">
        <Button id="create-team-button" icon={FiPlus} onClick={() => openDialog({ type: "create" })}>
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
                aria-current={selectedId === item.id ? "page" : undefined}
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
                    <div className="team-header-actions">
                      {canManage && (
                        <Button icon={FiUserPlus} disabled={busy} onClick={() => openDialog({ type: "invite" })}>
                          Invite people
                        </Button>
                      )}
                      {team.role === 'owner' && (
                        <Button
                          variant="secondary"
                          className="team-delete-button"
                          icon={FiTrash2}
                          disabled={busy}
                          onClick={() => openDialog({ type: 'delete-team', team: { id: team.id, name: team.name } })}
                          aria-label={`Delete team ${team.name}`}
                        >
                          {team.deleting ? 'Finish deleting team' : 'Delete team'}
                        </Button>
                      )}
                    </div>
                  </div>
                  {team.deleting && <div className="team-deletion-notice notice notice-error" role="status">Deletion has not finished. This team is unavailable to members. Choose “Finish deleting team” to complete the cleanup.</div>}
                  <div className="team-content-tabs">
                    <nav className="tabs" aria-label="Team sections">
                      <button
                        className={tab === "members" ? "active" : ""}
                        aria-pressed={tab === "members"}
                        onClick={() => changeTab("members")}
                      >
                        Members
                        <span className="tab-count">{team.members.length}</span>
                      </button>
                      <button
                        className={tab === "requests" ? "active" : ""}
                        aria-pressed={tab === "requests"}
                        onClick={() => changeTab("requests")}
                        disabled={team.deleting}
                      >
                        Assessment requests
                      </button>
                      {canManage && (
                        <>
                          <button
                            className={tab === "invitations" ? "active" : ""}
                            aria-pressed={tab === "invitations"}
                            onClick={() => changeTab("invitations")}
                          >
                            Invitations
                          </button>
                          <button
                            className={tab === "results" ? "active" : ""}
                            aria-pressed={tab === "results"}
                            onClick={() => changeTab("results")}
                          >
                            Results
                          </button>
                          <button
                            className={tab === "activity" ? "active" : ""}
                            aria-pressed={tab === "activity"}
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
                  {tab === "requests" && (
                    <div className="team-requests">
                      <form className="panel-padding form-stack team-request-form" onSubmit={submitAssessmentRequest}>
                        <div>
                          <h3>Request an assessment</h3>
                          <p className="section-description">Send a topic and question count to your team admins.</p>
                        </div>
                        <ErrorNotice message={error} />
                        <label className="field">Assessment name<input value={requestTitle} onChange={(event) => setRequestTitle(event.target.value)} minLength={2} maxLength={80} required placeholder="e.g. Intro to circuits" /></label>
                        <label className="field">Topics and learning goals<textarea value={requestTopic} onChange={(event) => setRequestTopic(event.target.value)} minLength={8} maxLength={2000} rows={4} required placeholder="What should the assessment cover?" /></label>
                        <div className="form-grid">
                          <label className="field">Questions<input type="number" min="1" max="50" value={requestCount} onChange={(event) => setRequestCount(event.target.value)} /></label>
                          <label className="field">Difficulty<select value={requestDifficulty} onChange={(event) => setRequestDifficulty(event.target.value)}>{DIFFICULTY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                        </div>
                        <div className="form-actions"><Button type="submit" disabled={busy}>Send request</Button></div>
                      </form>
                      <ErrorNotice message={requests.error} onRetry={requests.reload} />
                      {requests.loading ? <LoadingState rows={3} /> : requests.data?.length ? (
                        <div className="team-request-list">
                          {requests.data.map((item) => (
                            <article className="team-request-card" key={item.id}>
                              <div className="team-request-heading"><div><h3>{item.title}</h3><p>Requested by {item.requestedBy.name} · {formatDate(item.createdAt)}</p></div><span className={`request-status request-${item.status}`}>{item.status.replace("_", " ")}</span></div>
                              <p>{item.topic}</p>
                              <div className="team-request-meta"><span>{item.questionCount} questions</span><span>{difficultyLabel(item.difficulty)}</span></div>
                              {canManage && ["open", "in_progress"].includes(item.status) && <div className="form-actions"><Button variant="primary" className="btn-sm" to="/dashboard/create" state={{ request: item, teamId: selectedId }}>Create assessment</Button><Button variant="secondary" className="btn-sm" disabled={busy} onClick={() => updateRequest(item, "in_progress")}>Accept</Button><Button variant="secondary" className="btn-sm" disabled={busy} onClick={() => updateRequest(item, "fulfilled")}>Mark fulfilled</Button><Button variant="ghost" className="btn-sm text-danger" disabled={busy} onClick={() => updateRequest(item, "declined")}>Decline</Button></div>}
                            </article>
                          ))}
                        </div>
                      ) : !requests.error && <EmptyState icon={FiClipboard} title="No assessment requests yet" description="Requests from team members will appear here for admins to review." />}
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
                                {canManage && team.role === "owner" &&
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
                                  {canManage && team.role === "owner" &&
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
                                      <div>
                                        <span className="table-title">{item.email}</span>
                                        <EmailDeliveryStatus status={item.emailStatus} sentAt={item.sentAt} nextAttemptAt={item.nextAttemptAt} />
                                      </div>
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
              title="No teams yet"
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
        closeDisabled={busy}
        onClose={closeDialog}
        title={dialogTitle}
        description={
          dialog?.type === "create"
            ? "Choose a name your teammates will recognize."
            : dialog?.type === "invite" && !createdInvitation
              ? `Invite a member or admin to ${team?.name || "your team"}.`
              : undefined
        }
      >
        <ErrorNotice message={error} />
        {dialog?.type === 'delete-team' && <form className="form-stack" onSubmit={removeTeam}>
          <div className="team-delete-summary">
            <p><strong>{dialog.team.name}</strong> will be permanently deleted for everyone. This cannot be undone.</p>
            <ul>
              <li>All members lose access and invitation links stop working.</li>
              <li>Team assessments, saved attempts, scores, and assessment requests are deleted.</li>
              <li>Reusable activities saved for this team are deleted.</li>
            </ul>
            <p className="field-hint">Member accounts, other teams, and personal assessments are kept.</p>
          </div>
          <label className="field" htmlFor="delete-team-confirmation">
            <span>Type <strong>{dialog.team.name}</strong> to confirm</span>
            <input id="delete-team-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={80} disabled={busy} required aria-describedby="delete-team-hint" />
          </label>
          <p className="field-hint" id="delete-team-hint">The name must match exactly. Assessments that are currently generating must finish before deletion.</p>
          <div className="form-actions">
            <Button variant="secondary" onClick={closeDialog} disabled={busy}>Keep team</Button>
            <Button type="submit" variant="danger" icon={FiTrash2} disabled={busy || deleteConfirmation !== dialog.team.name} aria-busy={busy}>{busy ? 'Deleting team…' : 'Delete team permanently'}</Button>
          </div>
        </form>}
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
          (createdInvitation ? (
            <InvitationReceipt invitation={createdInvitation} onDone={closeDialog} />
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
                  disabled={busy}
                  required
                  placeholder="teammate@example.com"
                />
              </label>
              <label className="field">
                Team role
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  disabled={busy}
                >
                  <option value="member">Member — take team assessments</option>
                  <option value="admin">
                    Admin — manage assessments and people
                  </option>
                </select>
              </label>
              <p className="field-hint">
                We’ll email a private invitation and give you a link to share.
              </p>
              <div className="form-actions">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={closeDialog}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy} icon={FiUserPlus} aria-busy={busy}>
                  {busy ? "Creating invitation…" : "Send invitation"}
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
