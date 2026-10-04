import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, ErrorNotice, LoadingState, PageHeading } from '../../components/ui';
import useResource from '../../hooks/useResource';
import DynamicWorkbench from '../../components/assessment/DynamicWorkbench';
import RichContent from '../../components/content/RichContent';
import '../../components/assessment/interactive.css';

const statuses = { requested: 'Requested', building: 'Building', ready: 'Registered', reused: 'Reused', failed: 'Failed', unsupported: 'Needs a new runtime capability', adapted: 'Recovered with another interaction' };

export default function EngineLibrary() {
  const teams = useResource('/teams');
  const [teamId, setTeamId] = useState('');
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState(null);
  const [value, setValue] = useState('');
  const query = new URLSearchParams({ page, ...(teamId ? { teamId } : {}) });
  const resource = useResource(`/engines?${query}`, { interval: 5000 });
  const data = resource.data;
  return <div className="route-transition">
    <PageHeading title="Engine library" description="Reusable interactions built automatically from assessment requirements."><Button to="/dashboard/create">Create assessment</Button></PageHeading>
    <div className="notice notice-info"><span>When a question needs a new interaction, its requirements appear here. The builder validates and registers a reusable engine automatically. Later assessments can reuse it. Engine previews have no grading or saved scores.</span></div>
    <label className="field" style={{ maxWidth: 360, marginTop: 20 }}>Engine workspace<select value={teamId} onChange={(e) => { setTeamId(e.target.value); setPage(1); setPreview(null); setValue(''); }}><option value="">Personal</option>{(teams.data || []).filter((team) => ['owner', 'admin'].includes(team.role)).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
    <ErrorNotice message={teams.error || resource.error} onRetry={resource.reload} />
    {resource.loading && !data && <LoadingState />}
    {data && <>
      <div className="engine-library-grid">{data.engines.map((engine) => <section className="panel engine-library-card" key={engine.id}><span className="interaction-badge">Registered · v{engine.definition.version}</span><h3>{engine.definition.title}</h3><RichContent text={engine.definition.description} /><p>{engine.definition.controls.length} controls · {engine.definition.metrics.length} measurements · {engine.definition.minutes} minutes per task</p><Button variant="secondary" onClick={() => { setPreview(engine); setValue(''); }}>Explore engine</Button></section>)}</div>
      {data.engines.length === 0 && <p className="lab-preview-note">No custom engines yet. Create an interactive assessment requesting something such as a kinetic energy calculator, a truth table, or a multi-field labeling exercise.</p>}
      {preview && <section className="panel lab-preview-panel"><Button variant="secondary" onClick={() => setPreview(null)}>Close preview</Button><DynamicWorkbench key={preview.id} config={{ engine: preview.definition, instructions: 'Explore the available controls and measurements. Each assessment adds its own task and private grading checks.' }} value={value} onChange={setValue} /></section>}
      <section className="panel" style={{ padding: 24, marginTop: 24 }}><h2>Question engine requests</h2>{data.requests.length === 0 && <p className="lab-preview-note">Requirements are recorded here before building starts.</p>}{data.requests.map((request) => <article className="engine-request" key={request.id}><h3>{request.domain || 'Assessment'} · Question {request.slot + 1}<span className="soft-tag">{statuses[request.status]}</span></h3><p><strong>{request.objective}</strong></p><p>{request.requirement}</p><p>{request.message}</p><p><code>{request.key}</code> · <Link className="text-link" to={`/dashboard/take?testID=${encodeURIComponent(request.testID)}`}>Open assessment</Link></p></article>)}<div className="form-actions"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span>{data.page} / {data.pages}</span><Button variant="secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button></div></section>
    </>}
  </div>;
}
