import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button, ErrorNotice, PageLoader } from "../components/ui";
import { api } from "../lib/api";

export default function ProtectedRoute() {
  const location = useLocation();
  const [status, setStatus] = useState("loading");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const expired = () => setStatus("anonymous");
    window.addEventListener("abyuday:session-expired", expired);
    return () => window.removeEventListener("abyuday:session-expired", expired);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    api
      .post("/auth/check", {}, { signal: controller.signal })
      .then(() => {
        if (!controller.signal.aborted) setStatus("authenticated");
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setStatus(
            [401, 403].includes(error.response?.status)
              ? "anonymous"
              : "unavailable",
          );
      });
    return () => controller.abort();
  }, [revision]);
  if (status === "loading") return <PageLoader />;
  if (status === "unavailable")
    return (
      <main className="standalone-page">
        <div className="standalone-panel panel">
          <h1>Your workspace is a moment away.</h1>
          <ErrorNotice message="We could not connect to the server. Please try again." />
          <Button onClick={() => setRevision((value) => value + 1)}>
            Reconnect
          </Button>
        </div>
      </main>
    );
  return status === "authenticated" ? (
    <Outlet />
  ) : (
    <Navigate
      to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
      replace
    />
  );
}
