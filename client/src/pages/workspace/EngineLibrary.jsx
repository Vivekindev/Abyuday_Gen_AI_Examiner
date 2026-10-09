import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiLayers, FiPlus } from 'react-icons/fi';
import { Button, EmptyState, ErrorNotice, LoadingState, PageHeading, SectionHeading } from '../../components/ui';
import useResource from '../../hooks/useResource';
import DynamicWorkbench from '../../components/assessment/DynamicWorkbench';
import RichContent from '../../components/content/RichContent';
import { ACTIVITY_TEMPLATES } from '../../../../shared/activityTemplates.js';
import '../../components/assessment/interactive.css';

const statuses = {
  requested: 'Requested', building: 'Building', ready: 'Ready', reused: 'Reused',
  failed: 'Failed', unsupported: 'Unavailable', adapted: 'Alternative activity',
};

export default function EngineLibrary() {
  const teams = useResource('/teams');
  const [teamId, setTeamId] = useState('');
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState(null);
  const [value, setValue] = useState('');
  const query = new URLSearchParams({ page, ...(teamId ? { teamId } : {}) });
  const resource = useResource('/engines?' + query, { interval: 5000 });
  const data = resource.data;

  return (
    <div className="route-transition engine-library-page">
      <PageHeading title="Engine library" description="Explore reusable activities for your assessments.">
        <Button to="/dashboard/create" icon={FiPlus}>Create assessment</Button>
      </PageHeading>

      <section className="workspace-section" aria-labelledby="builtin-activities">
        <SectionHeading id="builtin-activities" title="Built-in activities" description="Ready-to-use formats that adapt to your topic and learning goals.">
          <Link className="text-link" to="/dashboard/labs">Open playground <FiArrowRight aria-hidden="true" /></Link>
        </SectionHeading>
        <div className="engine-library-grid">
          {Object.entries(ACTIVITY_TEMPLATES).map(([kind, activity]) => (
            <article className="panel engine-library-card" key={kind}>
              <div className="engine-card-meta"><span className="soft-tag">Built in</span><span>{activity.minutes} min / question</span></div>
              <h3>{activity.name}</h3>
              <p>{activity.description}</p>
              <p className="engine-card-topics">{activity.topics.join(' · ')}</p>
              <Button variant="secondary" to={'/dashboard/labs?activity=' + kind}>Try activity <FiArrowRight aria-hidden="true" /></Button>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-section" aria-labelledby="custom-activities">
        <SectionHeading id="custom-activities" title="Custom activities" description="Activities created for your assessments can be reused in the same workspace.">
          <label className="field engine-workspace-filter">Workspace
            <select value={teamId} onChange={(event) => { setTeamId(event.target.value); setPage(1); setPreview(null); setValue(''); }}>
              <option value="">Personal</option>
              {(teams.data || []).filter((team) => !team.deleting && ['owner', 'admin'].includes(team.role)).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
        </SectionHeading>
        <ErrorNotice message={teams.error} onRetry={teams.reload} />
        <ErrorNotice message={resource.error} onRetry={resource.reload} />
        {resource.loading && !data && <section className="panel"><LoadingState /></section>}
        {data && (
          data.engines.length ? (
            <div className="engine-library-grid">
              {data.engines.map((engine) => (
                <article className="panel engine-library-card" key={engine.id}>
                  <div className="engine-card-meta"><span className="soft-tag">Custom activity</span><span>Version {engine.definition.version}</span></div>
                  <h3>{engine.definition.title}</h3>
                  <RichContent text={engine.definition.description} />
                  <p className="engine-card-topics">{engine.definition.controls.length} controls · {engine.definition.metrics.length} measurements · {engine.definition.minutes} min</p>
                  <Button variant="secondary" onClick={() => { setPreview(engine); setValue(''); }}>Preview activity <FiArrowRight aria-hidden="true" /></Button>
                </article>
              ))}
            </div>
          ) : <section className="panel"><EmptyState icon={FiLayers} title="No custom activities yet" description="Create an interactive assessment. Custom activities appear here when a topic needs a new format." /></section>
        )}
        {preview && (
          <section className="panel engine-preview">
            <div className="panel-heading"><div><h2>{preview.definition.title}</h2><p>Practice preview · responses are not saved</p></div><Button variant="secondary" onClick={() => setPreview(null)}>Close preview</Button></div>
            <div className="panel-padding"><DynamicWorkbench key={preview.id} config={{ engine: preview.definition, instructions: 'Explore the available controls and measurements. Each assessment adds its own task.' }} value={value} onChange={setValue} /></div>
          </section>
        )}
      </section>

      {data && (
        <section className="panel engine-requests-panel" aria-labelledby="activity-requests">
          <div className="panel-heading"><div><h2 id="activity-requests">Activity requests</h2><p>Track custom activities being prepared for your assessments.</p></div></div>
          {data.requests.length ? data.requests.map((request) => (
            <article className="engine-request" key={request.id}>
              <div className="engine-request-heading"><h3>{request.domain || 'Assessment'} · Question {request.slot + 1}</h3><span className="soft-tag">{statuses[request.status] || request.status}</span></div>
              <p><strong>{request.objective}</strong></p>
              <p>{request.requirement}</p>
              {request.message && <p>{request.message}</p>}
              <Link className="text-link" to={'/dashboard/take?testID=' + encodeURIComponent(request.testID)}>View assessment <FiArrowRight aria-hidden="true" /></Link>
            </article>
          )) : <EmptyState icon={FiLayers} title="No activity requests" description="Requests appear when an assessment needs a custom activity." />}
          <div className="table-footer"><span>Page {data.page} of {data.pages}</span><div className="pagination"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button></div></div>
        </section>
      )}
    </div>
  );
}
