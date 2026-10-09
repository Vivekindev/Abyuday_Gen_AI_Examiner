import { FiBookOpen, FiTarget, FiUsers } from "react-icons/fi";
import { PageHeading, SectionLink } from "../../components/ui";

const questions = [
  ["How do I manage email alerts?", "Open Settings → Notifications to turn assessment generation and team updates on or off. Invitations and security emails remain enabled. Team alerts include assessment requests, membership changes, and ownership updates."],
  [
    "How does assessment creation work?",
    "Choose a name and describe the topics you want to cover. Set the number of questions, difficulty, model, and audience, then select Create assessment. You’ll be taken to your assessment library to follow progress.",
  ],
  [
    "Why is my assessment queued or generating?",
    "Questions are created in the background. Queued means your assessment is waiting for the worker; generating means it is being processed. Your library refreshes every 10 seconds. Generation alerts are emailed when delivery is enabled. If generation fails, choose Retry generation from the assessment library or details page.",
  ],
  [
    "How do I share an assessment?",
    "Use the copy-link action in the assessment library. Personal assessments can be taken by anyone signed in with the link. Team assessments require membership in that team.",
  ],
  [
    "What happens if I leave during an assessment?",
    "Saved answers remain on the server and you can resume using the same link. The timer continues running while you’re away. When time ends, your saved answers determine your score.",
  ],
  [
    "What can team members, admins, and owners do?",
    "Members can take team assessments. Admins can create team assessments, invite people, manage members, and review team results. Owners can also change member roles, transfer ownership, and delete their team.",
  ],
  [
    "How do I delete a team?",
    "Open Teams & people, select a team you own, and choose Delete team beside Invite people. Type the team name to confirm. This permanently removes the team, its assessments, attempts, scores, requests, invitations, and saved activity engines. Member accounts and personal assessments are kept. Wait for any assessment generation to finish first.",
  ],
  [
    "How do team invitations work?",
    "An owner or admin sends an invitation to an email address. The invitation is emailed when delivery is enabled, and its link can also be copied and shared. The recipient must sign in with that exact email address. Links expire after seven days and can be revoked from the team’s Invitations tab, which also shows email delivery status.",
  ],
  [
    "Where can I review or export results?",
    "Open Results to review attempts, analytics, and your highest scores. Team owners and admins can select a team to view rankings for each assessment. Use Export CSV to download completed results for the selected period.",
  ],
  [
    "How is platform admin access managed?",
    "Platform admins can view data across the app in the Admin area. Only the configured platform owner can add or remove admins under Admin access. Team roles do not grant platform access.",
  ],
  [
    "How do I change the theme?",
    "Use the theme switch in the top bar, or select Light, Dark, or System in Settings under Appearance. Your choice is saved on this device.",
  ],
  [
    "What activity and usage is recorded?",
    "Platform admins can review recorded AI tokens, requests, and account activity in Admin under Usage & monitoring. Team owners and admins can view usage and activities within their team, including assessment starts, saved answers, completions, explanations, and membership changes. Activity logs contain event details, not answer contents. Activity history lasts 90 days, API metrics last 30 days, and AI usage records are retained. Recording begins when monitoring is enabled; earlier token consumption cannot be recovered.",
  ],
];
export default function Help() {
  return (
    <div className="route-transition">
      <PageHeading title="Help" description="Guides and answers for assessments, teams, and your account." />
      <div className="help-grid">
        {[
          [
            FiBookOpen,
            "Build your first assessment",
            "A clear topic, the right difficulty, and a few thoughtful questions.",
            "/dashboard/create",
            "Start creating",
          ],
          [
            FiTarget,
            "Take on a challenge",
            "Open an assessment, save your answers, and learn from your results.",
            "/dashboard/take",
            "Find an assessment",
          ],
          [
            FiUsers,
            "Learn as a team",
            "Invite people, share assessments, and see how everyone is progressing.",
            "/dashboard/teams",
            "Explore teams",
          ],
        ].map(([Icon, title, description, to, label]) => (
          <article className="panel help-card" key={to}>
            <Icon aria-hidden="true" />
            <h2>{title}</h2>
            <p>{description}</p>
            <SectionLink to={to}>{label}</SectionLink>
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Common questions</h2>
          </div>
        </div>
        <div className="faq">
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
