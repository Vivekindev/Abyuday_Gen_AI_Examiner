import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiBarChart2,
  FiFileText,
  FiLinkedin,
  FiMapPin,
  FiUsers,
} from "react-icons/fi";
import { Brand, Button } from "../components/ui";
import WorkspaceIllustration from "../components/ui/WorkspaceIllustration";
import creatorPortrait from "../assets/creator/vivek-m.jpeg";
import ThemeToggle from "../theme/ThemeToggle";
import "./landing.css";

export default function HomePage() {
  return (
    <div className="landing-page">
      <header className="public-header">
        <Brand />
        <nav aria-label="Main navigation">
          <ThemeToggle />
          <a className="creator-nav-link" href="#creator">
            The creator
          </a>
          <Link to="/login">Sign in</Link>
          <Button to="/register">Create account</Button>
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-intro">
            <span className="landing-kicker">
              <span />
              Assessment workspace
            </span>
            <h1>
              Create assessments.
              <br />
              <span className="hero-emphasis">Understand progress.</span>
            </h1>
            <p>
              Build tests from your topics, share them with a team, and review
              results in one workspace.
            </p>
            <div className="heading-actions">
              <Button to="/register">
                Get started <FiArrowRight />
              </Button>
              <Button variant="secondary" to="/dashboard/take">
                Take a test
              </Button>
            </div>
          </div>
          <WorkspaceIllustration />
        </section>
        <section className="landing-features" aria-label="Workspace features">
          {[
            [
              FiFileText,
              "Create and share",
              "Set a topic, difficulty, and question count. Track generation and share a test link.",
            ],
            [
              FiUsers,
              "Manage your team",
              "Invite members and assign roles to control who can create assessments and see results.",
            ],
            [
              FiBarChart2,
              "Review results",
              "Explore scores, answer breakdowns, and team rankings. Export completed results.",
            ],
          ].map(([Icon, title, description], index) => (
            <article key={title}>
              <span className={`feature-mark feature-mark-${index}`}>
                <Icon aria-hidden="true" />
              </span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </section>
        <section
          className="creator-section"
          id="creator"
          aria-labelledby="creator-heading"
        >
          <div className="creator-photo">
            <img
              src={creatorPortrait}
              alt="Vivek M, creator of Abyuday"
              width="1254"
              height="1254"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="creator-details">
            <p className="landing-kicker">Behind Abyuday</p>
            <h2 id="creator-heading">
              Meet the creator<span>.</span>
            </h2>
            <h3>Vivek M</h3>
            <p className="creator-role">Associate 2 Software Developer</p>
            <p className="creator-company">
              State Street <span aria-hidden="true">·</span>{" "}
              <FiMapPin aria-hidden="true" /> Bangalore
            </p>
            <a
              className="creator-link"
              href="https://www.linkedin.com/in/vivekindev/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FiLinkedin aria-hidden="true" />
              Connect on LinkedIn
              <FiArrowUpRight aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
          <span className="creator-monogram" aria-hidden="true">
            vm<span>.</span>
          </span>
        </section>
      </main>
      <footer className="public-footer">
        <span>
          © {new Date().getFullYear()} Abyuday{" "}
          <span className="footer-dot">·</span> Created by Vivek M
        </span>
        <Link to="/login">
          Open workspace <FiArrowRight />
        </Link>
      </footer>
    </div>
  );
}
