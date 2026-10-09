import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowUpRight, Github, MoveUpRight } from 'lucide-react';
import previews from '../lib/previews.json';
import { github } from '../lib/projects.js';
import { loadData } from '../lib/data.js';
import { Magnetic, Reveal, usePortfolioMotion } from './PortfolioMotion.jsx';

const chartLabels = { 'revenue-funnel': 'Monthly qualified leads', 'customer-experience': 'Monthly order volume', 'credit-portfolio': 'Monthly funded principal', 'saas-retention': 'Month-end MRR · synthetic data' };
const dateLabel = value => new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T00:00:00Z`));
const monthIndex = value => { const [year, month] = value.split('-').map(Number); return year * 12 + month - 1; };

function ChartPreview({ project }) {
  const { reduced } = usePortfolioMotion();
  const values = previews[project.id];
  const [active, setActive] = useState(values.length - 1);
  const max = Math.max(...values.map(d => d.value), 1);
  const firstMonth = monthIndex(values[0].month), duration = Math.max(monthIndex(values.at(-1).month) - firstMonth, 1);
  const points = values.map(d => ({ x: 12 + (monthIndex(d.month) - firstMonth) / duration * 476, y: 153 - d.value / max * 118 }));
  const path = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '), selected = points[active];
  const month = values[active].month;
  const value = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(values[active].value);
  const prefix = project.id === 'credit-portfolio' ? '$' : project.id === 'saas-retention' ? 'CU ' : '';
  function hover(event) {
    if (event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const position = (event.clientX - rect.left) / rect.width * 500;
    setActive(points.reduce((nearest, point, i) => Math.abs(point.x - position) < Math.abs(points[nearest].x - position) ? i : nearest, 0));
  }
  function key(event) {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      setActive(previous => event.key === 'Home' ? 0 : event.key === 'End' ? values.length - 1 : Math.max(0, Math.min(values.length - 1, previous + (event.key === 'ArrowRight' ? 1 : -1))));
    }
  }
  return <div className="preview-window">
    <div className="preview-window-top"><div><i /><i /><i /></div><span>satya / {project.short.toLowerCase()}</span><span className="preview-live"><i /> LIVE PREVIEW</span></div>
    <div className="preview-window-body"><div className="preview-title"><span>THE BIG PICTURE</span><ArrowUpRight size={19} /></div>
      <motion.div className="preview-kpis" initial={reduced ? false : 'hidden'} whileInView="visible" viewport={{ once: true, amount: .2 }}>
        {project.stats.map((stat, i) => <div key={stat.label}><span>{stat.label}</span><div className="kpi-mask"><motion.strong
          variants={{ hidden: { y: '110%' }, visible: { y: 0 } }} transition={{ duration: reduced ? 0 : .8, delay: reduced ? 0 : i * .08 }}>{stat.value}</motion.strong></div></div>)}
      </motion.div>
      <div className="preview-chart-heading"><h4>{chartLabels[project.id]}</h4><span>{values.length} MONTHS</span></div>
      <div className="preview-chart" tabIndex={0} role="group" aria-label={`${chartLabels[project.id]}. Use left and right arrow keys to explore months.`}
        onPointerMove={hover} onKeyDown={key}>
        <svg viewBox="0 0 500 178" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id={`area-${project.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={project.color} stopOpacity=".18" /><stop offset="100%" stopColor={project.color} stopOpacity="0" /></linearGradient></defs>
          {[38, 76, 114, 153].map(y => <line key={y} x1="0" x2="500" y1={y} y2={y} stroke="#ffffff09" strokeDasharray="3 5" />)}
          <polygon points={`12,170 ${path} 488,170`} fill={`url(#area-${project.id})`} />
          <motion.polyline points={path} fill="none" stroke={project.color} strokeWidth="2.1" strokeLinejoin="round" strokeLinecap="round"
            initial={reduced ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.7 }} />
          <line x1={selected.x} x2={selected.x} y1="15" y2="169" stroke={project.color} strokeOpacity=".25" strokeDasharray="3 4" />
          <circle cx={selected.x} cy={selected.y} r="7" fill={project.color} fillOpacity=".12" /><circle cx={selected.x} cy={selected.y} r="3.2" fill={project.color} stroke="#142018" strokeWidth="2" />
        </svg>
      </div>
      <div className="preview-chart-caption"><span>{dateLabel(values[0].month)}<i />{dateLabel(values.at(-1).month)}</span><span aria-live="polite">{dateLabel(month)} <strong>{prefix}{value}</strong></span></div>
    </div>
    <div className="preview-window-footer"><span><i /> SOURCE-BACKED. READY TO EXPLORE.</span><MoveUpRight size={13} /></div>
  </div>;
}

export default function ProjectShowcase({ project, index }) {
  const ref = useRef(null), spotlight = useRef(null);
  const { reduced, finePointer } = usePortfolioMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, .5, 1], [35, 0, -35]);
  const rotate = useTransform(scrollYProgress, [0, .5, 1], [5, 0, -3]);
  const preload = () => loadData(project.id).catch(() => {});
  function move(event) {
    if (reduced || !finePointer || event.pointerType === 'touch') return;
    const box = ref.current.getBoundingClientRect();
    spotlight.current.style.setProperty('--light-x', `${event.clientX - box.left}px`);
    spotlight.current.style.setProperty('--light-y', `${event.clientY - box.top}px`);
  }
  return <article ref={ref} className={`project-feature project-feature-${index}`} style={{ '--project-color': project.color }} onPointerMove={move}>
    <div ref={spotlight} className="feature-light" aria-hidden="true" />
    <div className="feature-copy"><Reveal><div className="project-category"><span className="project-number">/{project.number}</span><span>{project.category}</span><span className="category-line" /></div>
      <h3>{project.title.split('\n').map(line => <span key={line}>{line}</span>)}</h3><p>{project.description}</p>
      <div className="project-tags">{project.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
      <div className="project-actions"><Magnetic><Link className="project-preview" to={`/dashboard/${project.id}`} onMouseEnter={preload} onFocus={preload}>Explore dashboard <ArrowUpRight size={18} /></Link></Magnetic>
        <a href={`${github}/${project.repo}`} target="_blank" rel="noreferrer"><Github size={15} /><span>Source code</span><ArrowUpRight size={13} /></a></div>
    </Reveal></div>
    <motion.div className="feature-preview" style={{ y: reduced ? 0 : y, rotateX: reduced ? 0 : rotate }}>
      <Reveal delay={.08}><ChartPreview project={project} /><div className="feature-preview-shadow" aria-hidden="true" /></Reveal>
    </motion.div>
  </article>;
}
