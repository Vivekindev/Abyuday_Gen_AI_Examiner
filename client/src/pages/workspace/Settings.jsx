import { useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FiCheck, FiLock, FiShield } from "react-icons/fi";
import { Avatar, Button, ErrorNotice, PageHeading } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useTheme } from "../../theme/context";

export default function Settings() {
  const { me, setMe } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const tab = ["security", "appearance"].includes(params.get("tab"))
    ? params.get("tab")
    : "profile";
  const { preference, setPreference } = useTheme();
  const [name, setName] = useState(me?.name || "");
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setName(me?.name || "");
  }, [me?.name]);
  const saveProfile = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.patch("/me", { name: name.trim() });
      setMe(data);
      toast.success("Your profile has been updated");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  const savePassword = async (event) => {
    event.preventDefault();
    setError("");
    if (passwords.newPassword !== passwords.confirm) {
      setError("Your new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/me/password", passwords);
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password changed", {
        description: "Your other sessions have been signed out.",
      });
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="settings-layout route-transition">
      <PageHeading title="Settings" description="Manage your profile, security, and appearance." />
      <nav className="tabs" aria-label="Settings sections">
        <button
          className={tab === "profile" ? "active" : ""}
          onClick={() => {
            setParams({});
            setError("");
          }}
        >
          Profile
        </button>
        <button
          className={tab === "security" ? "active" : ""}
          onClick={() => {
            setParams({ tab: "security" });
            setError("");
          }}
        >
          Security
        </button>
        <button
          className={tab === "appearance" ? "active" : ""}
          onClick={() => {
            setParams({ tab: "appearance" });
            setError("");
          }}
        >
          Appearance
        </button>
      </nav>
      <ErrorNotice message={error} />
      {tab === "appearance" ? (
        <section className="panel">
          <div className="settings-section">
            <div>
              <h2>Theme</h2>
              <p>Saved on this device.</p>
            </div>
            <fieldset className="theme-options">
              <legend className="sr-only">Choose a theme</legend>
              {[
                ["light", "Light"],
                ["dark", "Dark"],
                ["system", "System"],
              ].map(([value, label]) => (
                <label
                  className={`theme-option ${preference === value ? "selected" : ""}`}
                  key={value}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={value}
                    checked={preference === value}
                    onChange={() => setPreference(value)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          </div>
        </section>
      ) : tab === "profile" ? (
        <section className="panel">
          <div className="settings-section">
            <div>
              <h2>Personal information</h2>
              <p>This is how you appear in your workspace and to your team.</p>
            </div>
            <div>
              <div className="profile-preview">
                <Avatar name={me?.name || "Your name"} size="large" />
                <div>
                  <strong>{me?.name || "Your profile"}</strong>
                  <small>{me?.email}</small>
                </div>
              </div>
              <form className="settings-form" onSubmit={saveProfile}>
                <label className="field">
                  Display name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    minLength={2}
                    maxLength={80}
                    required
                    autoComplete="name"
                  />
                </label>
                <label className="field">
                  Email address
                  <input type="email" value={me?.email || ""} readOnly />
                  <small>
                    Your email identifies your account and team invitations.
                  </small>
                </label>
                <div className="form-actions">
                  <Button
                    type="submit"
                    icon={FiCheck}
                    disabled={busy || !me || name.trim() === me.name}
                  >
                    {busy ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="settings-section">
            <div>
              <h2>Change password</h2>
              <p>
                Keep your account secure with a password you don’t use
                elsewhere.
              </p>
            </div>
            <form className="settings-form" onSubmit={savePassword}>
              <div className="notice notice-info">
                <FiShield />
                <span>
                  If you signed up with Google only, continue using Google to
                  manage your sign-in security.
                </span>
              </div>
              {[
                ["currentPassword", "Current password", "current-password"],
                ["newPassword", "New password", "new-password"],
                ["confirm", "Confirm new password", "new-password"],
              ].map(([key, label, autoComplete]) => (
                <label className="field" key={key}>
                  {label}
                  <input
                    type="password"
                    value={passwords[key]}
                    onChange={(event) =>
                      setPasswords((previous) => ({
                        ...previous,
                        [key]: event.target.value,
                      }))
                    }
                    required
                    minLength={key === "currentPassword" ? undefined : 8}
                    maxLength={128}
                    autoComplete={autoComplete}
                  />
                  {key === "newPassword" && (
                    <small>Use at least 8 characters.</small>
                  )}
                </label>
              ))}
              <div className="form-actions">
                <Button icon={FiLock} type="submit" disabled={busy}>
                  {busy ? "Updating…" : "Update password"}
                </Button>
              </div>
              <p className="field-hint">
                Changing your password signs out your other sessions.
              </p>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
