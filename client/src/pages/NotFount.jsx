import { FiArrowLeft, FiCompass } from "react-icons/fi";
import { Brand, Button } from "../components/ui";

export default function NotFound() {
  return (
    <main className="standalone-page">
      <Brand />
      <section className="standalone-panel panel">
        <span className="empty-icon">
          <FiCompass />
        </span>
        <p className="eyebrow">404 · A small detour</p>
        <h1>Page not found.</h1>
        <p>
          The link may have changed, or the page may no longer exist. Your
          workspace is still right here.
        </p>
        <Button to="/dashboard" icon={FiArrowLeft}>
          Back to workspace
        </Button>
      </section>
    </main>
  );
}
