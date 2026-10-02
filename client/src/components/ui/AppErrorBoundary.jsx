import { Component } from "react";

export default class AppErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error("Workspace rendering failed:", error);
  }
  render() {
    if (this.state.failed)
      return (
        <main className="standalone-page">
          <section className="standalone-panel panel">
            <p className="eyebrow">A small interruption</p>
            <h1>Let’s open your workspace again.</h1>
            <p>
              Something interrupted this page. Your saved assessments and
              results are still on the server.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload this page
            </button>
            <a className="text-link" href="/dashboard">
              Back to workspace
            </a>
          </section>
        </main>
      );
    return this.props.children;
  }
}
