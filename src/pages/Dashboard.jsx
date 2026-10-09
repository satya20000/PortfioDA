import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, Database, Download, Github, Info, LayoutDashboard, Link2, ListFilter, RotateCcw, X } from 'lucide-react';
import { projects, github } from '../lib/projects.js';
import { loadData } from '../lib/data.js';
import { buildModel, filterRows, human, money, number, pct, toCSV } from '../lib/analytics.mjs';
import { Overview, Segments, Records, detailColumns } from '../components/DashboardViews.jsx';
import SourceDialog from '../components/SourceDialog.jsx';
import '../dashboard.css';

function Kpi({ metric, unit }) {
  const display = metric.kind === 'money' ? money(metric.value, unit, true) : metric.kind === 'percent' ? pct(metric.value) : metric.kind === 'days' ? `${number(metric.value, 2)} d` : metric.kind === 'score' ? `${number(metric.value, 2)} / 5` : number(metric.value);
  return <div className="kpi-card"><div className="kpi-label"><span>{metric.label}</span><button type="button" className="metric-info" aria-label={`${metric.label}: ${metric.definition}`}><Info size={13} /><span className="metric-tooltip" role="tooltip">{metric.definition}</span></button></div><strong>{display}</strong><p>{metric.description}</p></div>;
}
function DashboardBody({ project }) {
  const [data, setData] = useState(null), [error, setError] = useState(null), [retry, setRetry] = useState(0), [sourceOpen, setSourceOpen] = useState(false), [copied, setCopied] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    let active = true;
    setData(null); setError(null);
    document.title = `${project.dashboardTitle} — Satya Ranjan Nayak`;
    window.scrollTo(0, 0);
    loadData(project.id).then(value => { if (active) setData(value); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [project.id, retry]);
  const bounds = useMemo(() => { if (!data) return null; const months = [...new Set(data.rows.map(r => r.month))].sort(); return { from: months[0], to: months.at(-1) }; }, [data]);
  const choices = useMemo(() => data ? Object.fromEntries(project.filters.map(f => [f.key, [...new Set(data.rows.flatMap(r => f.key === 'category' ? r.categories : [r[f.key]]))].filter(v => v != null).map(String).sort()])) : {}, [data, project]);
  const filters = useMemo(() => {
    const validMonth = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '');
    return { from: validMonth(searchParams.get('from')) ? searchParams.get('from') : bounds?.from || '', to: validMonth(searchParams.get('to')) ? searchParams.get('to') : bounds?.to || '', ...Object.fromEntries(project.filters.map(f => [f.key, searchParams.get(f.key) || ''])) };
  }, [searchParams, bounds, project]);
  const selected = useMemo(() => data ? filterRows(data.rows, filters) : [], [data, filters]);
  const model = useMemo(() => data ? buildModel(project.id, selected, data, filters) : null, [data, project.id, selected, filters]);
  const tab = ['overview', 'segments', 'records'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
  const invalidPeriod = filters.from > filters.to;
  const tabs = [{ key: 'overview', label: 'Overview' }, { key: 'segments', label: project.id === 'saas-retention' ? 'Cohorts & segments' : 'Segment deep dive' }, { key: 'records', label: 'Source records' }];
  function update(key, value) {
    setSearchParams(current => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); return next; }, { replace: true });
  }
  function reset() { setSearchParams(tab !== 'overview' ? { tab } : {}, { replace: true }); }
  function exportData() {
    if (!model) return;
    const csv = toCSV(model.detail, detailColumns[project.id].map(c => c.key));
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `${project.id}_${filters.from}_${filters.to}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copyLink() { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError('Your browser could not copy the link. You can copy the current URL from the address bar.'); } }
  const filterCount = project.filters.filter(f => filters[f.key]).length + (bounds && (filters.from !== bounds.from || filters.to !== bounds.to) ? 1 : 0);
  return <div className="dashboard" style={{ '--accent': project.color }}><a className="skip-link" href="#dashboard-main">Skip to dashboard</a><aside className="dashboard-sidebar"><Link className="wordmark" to="/"><span className="brand-icon"><i /><i /><i /></span>satya<span className="brand-period">.</span></Link><div className="sidebar-caption">ANALYTICS WORKSPACE</div><nav aria-label="Project dashboards">{projects.map(p => <Link key={p.id} to={`/dashboard/${p.id}`} className={`sidebar-project ${p.id === project.id ? 'active' : ''}`} aria-current={p.id === project.id ? 'page' : undefined}><span className="sidebar-project-number">{p.number}</span><span>{p.short}</span>{p.id === project.id && <span className="sidebar-active-dot" />}</Link>)}</nav><div className="sidebar-bottom"><div className="sidebar-owner"><div className="owner-monogram">SN</div><div><strong>Satya Ranjan Nayak</strong><span>Data analyst · India</span></div></div><Link to="/#work"><ArrowLeft size={15} /> Back to portfolio</Link><a href={`${github}/${project.repo}`} target="_blank" rel="noreferrer"><Github size={15} /> Source on GitHub <ArrowUpRight size={13} /></a></div></aside>
    <div className="dashboard-body"><header className="dashboard-topbar"><div className="dashboard-breadcrumb"><LayoutDashboard size={15} /><span>Projects</span><ChevronDown size={12} className="breadcrumb-arrow" /><strong>{project.short}</strong></div><div><button onClick={copyLink} className="subtle-button"><span>{copied ? <Check size={14} /> : <Link2 size={14} />}</span>{copied ? 'Copied' : 'Copy view link'}</button><a className="subtle-button" href="/resume.pdf" download="Satya_Ranjan_Nayak_Resume.pdf"><Download size={14} /><span>Resume</span></a></div></header>
    <main id="dashboard-main" className="dashboard-main"><div className="dashboard-title-row"><div><div className="dashboard-eyebrow"><span style={{ background: project.color }} /> {project.category} <span className="eyebrow-slash">/ {project.number}</span></div><h1>{project.dashboardTitle}</h1><p>{project.brief}</p></div><div className="dashboard-actions"><button onClick={() => setSourceOpen(true)} disabled={!data} className="button button-outline button-small"><Database size={14} /> Data & definitions</button><button onClick={exportData} disabled={!model || !selected.length || invalidPeriod} className="button button-primary button-small" title="Export the full dashboard-filtered population"><Download size={14} /> Export CSV</button></div></div>
      {data && <><div className="dashboard-filter-bar"><div className="filter-label"><ListFilter size={15} /><span>Filters</span>{filterCount > 0 && <i>{filterCount}</i>}</div><div className="filter-controls"><label className="date-filter"><span>From</span><input type="month" aria-label="From month" min={bounds.from} max={bounds.to} value={filters.from} onChange={e => update('from', e.target.value)} /></label><label className="date-filter"><span>To</span><input type="month" aria-label="To month" min={bounds.from} max={bounds.to} value={filters.to} onChange={e => update('to', e.target.value)} /></label>{project.filters.map(f => <label className="select-filter" key={f.key}><span className="sr-only">{f.label}</span><select aria-label={f.label} value={filters[f.key]} onChange={e => update(f.key, e.target.value)}><option value="">{f.key === 'category' ? 'All product categories' : f.key === 'dtiBand' ? 'All debt-to-income bands' : f.key === 'status' ? 'All order statuses' : f.key === 'term' ? 'All loan terms' : `All ${f.label.toLowerCase()}s`}</option>{choices[f.key].map(value => <option value={value} key={value}>{human(value)}</option>)}</select><ChevronDown size={12} /></label>)}</div><button onClick={reset} className="filter-reset" title="Reset all dashboard filters"><RotateCcw size={14} /><span>Reset</span></button></div><div className="dashboard-scope"><span><span className="status-dot" /> {data.source.classification.split(' · ')[0]}</span><span>{filters.from} — {filters.to} <i>·</i> {number(selected.length)} {project.id === 'saas-retention' ? 'monthly segment observations' : 'selected records'}</span></div></>}
      {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => { setError(null); setRetry(x => x + 1); }}>Retry</button></div>}
      {!data && !error && <div className="dashboard-loading" role="status"><span className="loading-ring" /><h2>Bringing the data into focus.</h2><p>Loading the complete project snapshot…</p></div>}
      {data && invalidPeriod && <div className="dashboard-empty"><ListFilter size={30} /><h2>Start month is after end month.</h2><p>Choose a valid period to explore this project.</p></div>}
      {data && !invalidPeriod && !selected.length && <div className="dashboard-empty"><ListFilter size={30} /><h2>No records match this selection.</h2><p>Try a different period or reset the filters.</p><button className="button button-primary button-small" onClick={reset}>Reset filters</button></div>}
      {model && !invalidPeriod && selected.length > 0 && <><div className="kpi-grid" aria-label="Key performance indicators">{model.kpis.map(metric => <Kpi metric={metric} unit={project.unit} key={metric.label} />)}</div><div className="dashboard-tabs" role="tablist" aria-label="Analysis views">{tabs.map(t => <button role="tab" aria-selected={tab === t.key} aria-controls={`panel-${t.key}`} id={`tab-${t.key}`} className={tab === t.key ? 'active' : ''} key={t.key} onClick={() => update('tab', t.key)}>{t.label}{t.key === 'records' && <span>{number(model.detail.length)}</span>}</button>)}</div><div className="dashboard-tab-content" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>{tab === 'overview' ? <Overview project={project} model={model} /> : tab === 'segments' ? <Segments project={project} model={model} /> : <Records project={project} model={model} />}</div></>}
      <footer className="dashboard-footer"><span>Built around the question. Grounded in the data.</span><a href={`${github}/${project.repo}`} target="_blank" rel="noreferrer">Explore the SQL & Python <ArrowUpRight size={13} /></a></footer>
    </main></div>{sourceOpen && data && <SourceDialog data={data} rowCount={selected.length} filters={filters} onClose={() => setSourceOpen(false)} />}</div>;
}
export default function Dashboard() {
  const { projectId } = useParams();
  const project = projects.find(p => p.id === projectId);
  if (!project) return <main className="error-page"><h1>This project could not be found.</h1><Link className="button button-primary" to="/#work">Back to portfolio</Link></main>;
  return <DashboardBody key={project.id} project={project} />;
}
