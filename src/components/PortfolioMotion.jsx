import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { motion, MotionConfig, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { Pause, Play } from 'lucide-react';

const MotionContext = createContext({ reduced: false, paused: false, finePointer: false });
const easing = [0.22, 1, 0.36, 1];
export function usePortfolioMotion() { return useContext(MotionContext); }

export function PortfolioMotion({ children }) {
  const deviceReduced = useReducedMotion();
  const [paused, setPaused] = useState(() => {
    try { return localStorage.getItem('satya-motion-v1') === 'paused'; } catch { return false; }
  });
  const [finePointer, setFinePointer] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFinePointer(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  function toggleMotion() {
    const next = !paused;
    setPaused(next);
    try { localStorage.setItem('satya-motion-v1', next ? 'paused' : 'playing'); } catch { /* Optional preference storage. */ }
  }
  const reduced = !!deviceReduced || paused;
  return <MotionContext.Provider value={{ reduced, paused, finePointer, toggleMotion, deviceReduced }}>
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'} transition={{ ease: easing }}>
      <div className="portfolio" data-motion={reduced ? 'off' : 'on'}>{children}</div>
    </MotionConfig>
  </MotionContext.Provider>;
}

export function MotionToggle() {
  const { reduced, deviceReduced, toggleMotion } = usePortfolioMotion();
  const label = deviceReduced ? 'Reduced motion enabled by your device' : reduced ? 'Resume animation' : 'Pause animation';
  return <button className="motion-toggle" type="button" onClick={toggleMotion} disabled={!!deviceReduced}
    aria-label={label} aria-pressed={reduced} title={label}>
    {reduced ? <Play size={14} /> : <Pause size={14} />}<span>Motion {reduced ? 'off' : 'on'}</span>
  </button>;
}

export function Reveal({ children, className = '', delay = 0 }) {
  const { reduced } = usePortfolioMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 32 }}
    whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: reduced ? 0 : 0.8, delay: reduced ? 0 : delay, ease: easing }}>{children}</motion.div>;
}

export function SplitLine({ children, delay = 0, className = '' }) {
  const { reduced } = usePortfolioMotion();
  return <span className={`type-mask ${className}`}><motion.span initial={reduced ? false : { y: '110%', rotate: 3 }}
    animate={{ y: 0, rotate: 0 }} transition={{ duration: reduced ? 0 : 1.15, delay: reduced ? 0 : delay, ease: easing }}>{children}</motion.span></span>;
}

export function Magnetic({ children, className = '' }) {
  const { reduced, finePointer } = usePortfolioMotion();
  const x = useMotionValue(0), y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 180, damping: 18 }), smoothY = useSpring(y, { stiffness: 180, damping: 18 });
  function move(event) {
    if (reduced || !finePointer || event.pointerType === 'touch') return;
    const box = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - box.left - box.width / 2) * .12);
    y.set((event.clientY - box.top - box.height / 2) * .15);
  }
  return <div className={`magnetic-wrap ${className}`} onPointerMove={move} onPointerLeave={() => { x.set(0); y.set(0); }}>
    <motion.div style={{ x: reduced ? 0 : smoothX, y: reduced ? 0 : smoothY }}>{children}</motion.div>
  </div>;
}

export function PointerAura() {
  const { reduced, finePointer } = usePortfolioMotion();
  const x = useMotionValue(-1000), y = useMotionValue(-1000);
  const smoothX = useSpring(x, { stiffness: 75, damping: 25 }), smoothY = useSpring(y, { stiffness: 75, damping: 25 });
  useEffect(() => {
    if (reduced || !finePointer) return;
    const move = event => { if (event.pointerType !== 'touch') { x.set(event.clientX - 260); y.set(event.clientY - 260); } };
    const leave = () => { x.set(-1000); y.set(-1000); };
    window.addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerleave', leave);
    return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); };
  }, [reduced, finePointer, x, y]);
  return !reduced && finePointer ? <motion.div className="pointer-aura" aria-hidden="true" style={{ x: smoothX, y: smoothY }} /> : null;
}

function ScrollWord({ word, progress, start, end }) {
  const { reduced } = usePortfolioMotion();
  const color = useTransform(progress, [start, end], ['#62705b', '#ecf0e9']);
  return <motion.span style={{ color: reduced ? '#ecf0e9' : color }}>{word}{' '}</motion.span>;
}

export function ScrollStatement() {
  const target = useRef(null);
  const { scrollYProgress } = useScroll({ target, offset: ['start 0.85', 'end 0.55'] });
  const words = ['Good', 'analysis', 'makes', 'the', 'next', 'decision', 'clearer.'];
  return <section className="statement-section section-wrap" ref={target} aria-labelledby="statement-title">
    <Reveal><div className="eyebrow"><span className="tiny-line" /> A SIMPLE BELIEF</div></Reveal>
    <h2 id="statement-title" className="scroll-statement">{words.map((word, i) => <ScrollWord key={word} word={word}
      progress={scrollYProgress} start={i / words.length * .75} end={i / words.length * .75 + .2} />)}</h2>
    <Reveal><p>Clarity is the outcome. Curiosity is where it starts.</p></Reveal>
  </section>;
}
