import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiArrowRight, FiUsers } from "react-icons/fi";
import { toast } from "sonner";
import { Brand, Button, ErrorNotice, LoadingState } from "../components/ui";
import { api, errorMessage, formatDate } from "../lib/api";
import useResource from "../hooks/useResource";

export default function JoinTeam() {
  const token = new URLSearchParams(useLocation().search).get("token");
  const navigate = useNavigate();
  const resource = useResource(
    token ? `/teams/invites/${encodeURIComponent(token)}` : null,
  );
  const invite = resource.data;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const accept = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(
        `/teams/invites/${encodeURIComponent(token)}/accept`,
      );
      toast.success(`Welcome to ${data.name}`);
      navigate(`/dashboard/teams?team=${data.id}`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="standalone-page">
      <Brand />
      <section className="standalone-panel panel">
        <span className="empty-icon">
          <FiUsers />
        </span>
        <h1>
          {invite
            ? `You’re invited to ${invite.teamName}.`
            : "Your next team is waiting."}
        </h1>
        <ErrorNotice
          message={
            !token
              ? "This invitation link is missing a token."
              : resource.error || error
          }
        />
        {resource.loading && <LoadingState rows={2} />}
        {invite && (
          <>
            <p>
              Join as a <strong>{invite.role}</strong> and make room for shared
              progress.
            </p>
            <div className="invite-details">
              <span>Invited email</span>
              <strong>{invite.email}</strong>
              <span>Invitation expires</span>
              <strong>{formatDate(invite.expiresAt)}</strong>
            </div>
            <Button className="btn-block" disabled={busy} onClick={accept}>
              {busy ? "Joining your team…" : "Accept invitation"}
              <FiArrowRight />
            </Button>
          </>
        )}
        <Link
          className="text-link"
          to={`/login?returnTo=${encodeURIComponent(`/join?token=${token || ""}`)}`}
        >
          Sign in with the invited email
        </Link>
        <Link className="standalone-back" to="/dashboard">
          Back to workspace
        </Link>
      </section>
    </main>
  );
}
