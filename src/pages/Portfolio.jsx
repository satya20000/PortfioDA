import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowUpRight, ArrowDown, Github, Download, Menu, X, Database, Code2, ChartNoAxesCombined, Copy, Check, Asterisk } from 'lucide-react';
import DataOrb from '../components/DataOrb.jsx';
import ProjectShowcase from '../components/ProjectShowcase.jsx';
import { PortfolioMotion, MotionToggle, PointerAura, Reveal, SplitLine, Magnetic, ScrollStatement, usePortfolioMotion } from '../components/PortfolioMotion.jsx';
import { projects, github } from '../lib/projects.js';

const tools = ['SQL', 'Python', 'Power BI', 'Excel', 'PostgreSQL', 'DAX', 'Power Query'];
const steps = [
  { icon: Database, number: '01', title: 'Ask. Then structure.', description: 'Start with the business question. Clean the source, connect the tables, and build a foundation that deserves your trust.', tools: 'SQL / PostgreSQL / Power Query' },
  { icon: Code2, number: '02', title: 'Explore the possibilities.', description: 'Follow the patterns through cohorts, channels, and customer segments. Test the explanation before telling the story.', tools: 'Python / Pandas / NumPy / Excel' },
  { icon: ChartNoAxesCombined, number: '03', title: 'Make the answer clear.', description: 'Turn the analysis into a useful view. Put the right measures in context and give people somewhere meaningful to look next.', tools: 'Power BI / DAX / Matplotlib / PowerPoint' },
];

function Navigation() {
  const [menu, setMenu] = useState(false), [active, setActive] = useState('');
  const menuButton = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    ['top', 'work', 'about', 'toolkit', 'contact'].forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!menu) return;
    const previous = document.body.style.overflow;
    const content = [document.querySelector('main'), document.querySelector('.site-footer')].filter(Boolean);
    const wasInert = content.map(el => el.inert);
    content.forEach(el => { el.inert = true; });
    document.body.style.overflow = 'hidden';
    const key = event => { if (event.key === 'Escape') { setMenu(false); menuButton.current?.focus(); } };
    const resize = () => { if (window.innerWidth > 760) setMenu(false); };
    window.addEventListener('keydown', key); window.addEventListener('resize', resize);
    return () => {
      document.body.style.overflow = previous;
      content.forEach((el, i) => { el.inert = wasInert[i]; });
      window.removeEventListener('keydown', key); window.removeEventListener('resize', resize);
    };
  }, [menu]);
  return <>
    <header className="site-header"><a className="wordmark" href="#top" aria-label="Satya home"><span className="brand-icon"><i /><i /><i /></span>satya<span className="brand-period">.</span></a>
      <nav id="portfolio-navigation" className={`site-nav ${menu ? 'open' : ''}`} aria-label="Main navigation">
        {[['work', 'Work'], ['about', 'About'], ['toolkit', 'Approach'], ['contact', 'Connect']].map(([id, label]) => <a key={id} href={`#${id}`} className={active === id ? 'active' : ''}
          aria-current={active === id ? 'location' : undefined} onClick={() => setMenu(false)}>{label}{id === 'work' ? <sup>04</sup> : null}{id === 'contact' ? <ArrowUpRight size={14} /> : null}</a>)}
      </nav>
      <div className="header-controls"><MotionToggle /><button ref={menuButton} className="menu-toggle" type="button" aria-label={menu ? 'Close navigation' : 'Open navigation'}
        aria-expanded={menu} aria-controls="portfolio-navigation" onClick={() => setMenu(previous => !previous)}>{menu ? <X size={21} /> : <Menu size={21} />}</button></div>
    </header>
    {menu ? <button type="button" className="menu-backdrop" aria-label="Close navigation" onClick={() => setMenu(false)} /> : null}
  </>;
}

function Hero() {
  const target = useRef(null);
  const { reduced } = usePortfolioMotion();
  const { scrollYProgress } = useScroll({ target, offset: ['start start', 'end start'] });
  const artY = useTransform(scrollYProgress, [0, 1], [0, 95]), artOpacity = useTransform(scrollYProgress, [0, .65, 1], [1, .9, .25]);
  return <section className="hero" id="top" ref={target} aria-labelledby="hero-title">
    <div className="hero-grid-texture" aria-hidden="true" />
    <div className="hero-topline"><Reveal><p>SATYA RANJAN NAYAK <span>/</span> DATA ANALYST</p></Reveal><Reveal delay={.1}><div className="availability"><span className="status-dot" /> Open to roles & internships</div></Reveal></div>
    <div className="hero-grid"><div className="hero-copy"><h1 id="hero-title" aria-label="Making data make sense."><SplitLine delay={.12}>Making data</SplitLine><SplitLine delay={.24}>make <em>sense.</em><span className="hero-asterisk" aria-hidden="true"><Asterisk strokeWidth={1.4} /></span></SplitLine></h1>
      <Reveal delay={.3}><div className="hero-introduction"><span className="intro-marker" aria-hidden="true">↳</span><p className="hero-description">I’m an Electrical Engineering graduate drawn to the way data can explain how businesses work. I enjoy combining engineering problem solving with questions about customers, finance, and growth. Using SQL, Python, Excel, and Power BI, I explore patterns, build interactive dashboards, and turn complex datasets into clear insights that help people make better business decisions.</p></div>
        <div className="hero-actions"><Magnetic><a className="button button-primary" href="#work">Explore my work <ArrowUpRight size={18} /></a></Magnetic><Magnetic><a className="resume-link" href="/resume.pdf" download="Satya_Ranjan_Nayak_Resume.pdf">My resume <Download size={16} /></a></Magnetic></div>
      </Reveal></div>
      <motion.div className="hero-art" style={{ y: reduced ? 0 : artY, opacity: reduced ? 1 : artOpacity }}><DataOrb /></motion.div>
    </div>
    <div className="hero-bottom"><span className="hero-location"><i /> BASED IN INDIA <span> / </span> THINKING BEYOND BORDERS</span><a href="#work" className="scroll-cue"><span>SCROLL TO DISCOVER</span><span className="scroll-arrow"><ArrowDown size={17} /></span></a><span className="hero-edition">PORTFOLIO <span>—</span> 2026</span></div>
  </section>;
}

function ToolMarquee() {
  return <div className="skill-strip"><span className="strip-caption">THE TOOLS BEHIND<br />THE THINKING</span><div className="marquee-viewport"><div className="marquee-track">
    {[0, 1].map(copy => <div className="marquee-copy" key={copy} aria-hidden={copy ? true : undefined}>{tools.map(tool => <span key={tool}>{tool}<Asterisk size={20} strokeWidth={1.5} aria-hidden="true" /></span>)}</div>)}
  </div></div></div>;
}

function About() {
  return <section className="about-section section-wrap" id="about" aria-labelledby="about-title"><Reveal><div className="eyebrow"><span className="tiny-line" /> THE PERSON BEHIND THE QUERIES <span className="section-number">/ 02</span></div></Reveal>
    <div className="about-grid"><Reveal><h2 id="about-title">Curiosity first.<br /><em>Clarity always.</em></h2><div className="about-seal" aria-hidden="true"><div className="seal-orbit" /><div className="seal-orbit secondary" /><span>SN<span>ENGINEERING → ANALYTICS</span></span><Asterisk className="seal-asterisk" size={28} /></div><p className="about-signature">Satya Ranjan Nayak <ArrowUpRight size={20} /></p></Reveal>
      <Reveal delay={.1}><p className="about-lead">An engineering mind.<br />A curiosity for business.<br /><span>A habit of asking why.</span></p><p className="about-copy">My Electrical Engineering background taught me to break complex problems into parts. Data analytics gives me a way to bring those parts back together—and see what they mean for a business.</p><p className="about-copy">My projects explore e-commerce, credit portfolios, and subscription businesses. I enjoy the entire process: cleaning the source, testing the logic, and designing a dashboard that makes the findings useful.</p>
        <div className="education-line"><span>EDUCATION</span><strong>B.Tech, Electrical Engineering</strong><p>Odisha University of Technology and Research</p><div>2021 — 2025 <ArrowUpRight size={15} /></div></div>
        <div className="certification-line"><span>CERTIFICATIONS</span><p>HackerRank <i>↗</i> SQL Basic · SQL Intermediate · Python<br />Great Learning <i>↗</i> Power BI · Microsoft Excel</p></div>
      </Reveal></div>
  </section>;
}

function Approach() {
  return <section className="toolkit-section section-wrap" id="toolkit" aria-labelledby="approach-title"><Reveal><div className="section-heading"><div><div className="eyebrow"><span className="tiny-line" /> HOW I GET THERE <span className="section-number">/ 03</span></div><h2 id="approach-title">From a question<br />to <em>something useful.</em></h2></div><p>A clear process.<br />Room for the unexpected.</p></div></Reveal>
    <div className="approach-list">{steps.map(step => <Reveal key={step.number}><article className="approach-row"><span className="approach-number">{step.number}</span><div className="approach-title"><step.icon size={23} strokeWidth={1.4} /><h3>{step.title}</h3></div><div className="approach-description"><p>{step.description}</p><span>{step.tools}</span></div><ArrowUpRight className="approach-arrow" size={24} strokeWidth={1.3} /></article></Reveal>)}</div>
  </section>;
}

function Contact() {
  const [copied, setCopied] = useState(false), timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copyGithub() {
    try { await navigator.clipboard.writeText(github); setCopied(true); clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1800); }
    catch { window.open(github, '_blank', 'noopener,noreferrer'); }
  }
  return <section className="contact-section" id="contact" aria-labelledby="contact-title"><div className="contact-grid" aria-hidden="true" /><div className="contact-inner section-wrap"><Reveal><div className="eyebrow"><span className="contact-status" /> OPEN TO THE NEXT GOOD QUESTION <span className="section-number">/ 04</span></div>
    <div className="contact-heading"><h2 id="contact-title">Let’s find<br /><em>the story.</em></h2><Magnetic><a className="contact-arrow" href={github} target="_blank" rel="noreferrer" aria-label="Connect with Satya on GitHub"><ArrowUpRight size={65} strokeWidth={1.2} /><span className="contact-arrow-orbit" aria-hidden="true" /></a></Magnetic></div>
    <div className="contact-bottom"><p>Have a question worth exploring?<br />I’m looking for opportunities in data, business,<br />and finance analytics.</p><div><Magnetic><a className="button contact-button" href={github} target="_blank" rel="noreferrer"><Github size={17} /> Connect on GitHub <ArrowUpRight size={17} /></a></Magnetic><button className="copy-profile" type="button" onClick={copyGithub} aria-label="Copy GitHub profile URL">{copied ? <Check size={15} /> : <Copy size={15} />}<span aria-live="polite">{copied ? 'Copied' : 'Copy profile'}</span></button></div></div>
  </Reveal></div></section>;
}

function PortfolioPage() {
  const { hash } = useLocation();
  const { scrollYProgress } = useScroll(), { reduced } = usePortfolioMotion();
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });
  useEffect(() => {
    document.title = 'Satya Ranjan Nayak — Data, made clear.';
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView(); else window.scrollTo(0, 0);
  }, [hash]);
  return <><a className="skip-link" href="#main">Skip to content</a><PointerAura /><motion.div className="scroll-progress" style={{ scaleX: reduced ? scrollYProgress : progress }} /><Navigation />
    <main id="main"><Hero /><ToolMarquee /><section className="work-section section-wrap" id="work" aria-labelledby="work-title"><Reveal><div className="section-heading"><div><div className="eyebrow"><span className="tiny-line" /> SELECTED WORK <span className="section-number">/ 01</span></div><h2 id="work-title">Real questions.<br /><em>Measurable answers.</em></h2></div><div className="work-heading-side"><span className="work-count">04<span>PROJECTS</span></span><p>Four business questions.<br />Four different perspectives.</p></div></div></Reveal>
      <div className="project-list">{projects.map((project, index) => <ProjectShowcase project={project} index={index} key={project.id} />)}</div>
    </section><ScrollStatement /><About /><Approach /><Contact /></main>
    <footer className="site-footer"><a className="wordmark" href="#top">satya<span className="brand-period">.</span></a><span>Curiosity → Analysis → Clarity</span><p>© {new Date().getFullYear()} Satya Ranjan Nayak</p><a href="#top" className="back-to-top">Back to top <ArrowUpRight size={14} /></a></footer>
  </>;
}

export default function Portfolio() { return <PortfolioMotion><PortfolioPage /></PortfolioMotion>; }
