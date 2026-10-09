import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { usePortfolioMotion } from './PortfolioMotion.jsx';

const ROWS = 20, COLS = 36, COUNT = ROWS * COLS, TAU = Math.PI * 2;
const modes = [{ name: 'Globe', caption: 'A world of questions.' }, { name: 'Orbit', caption: 'Everything is connected.' }, { name: 'Signal', caption: 'Patterns become perspective.' }];
const shapes = modes.map((_, mode) => {
  const points = new Float32Array(COUNT * 3);
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
    const index = (row * COLS + col) * 3, u = (row + .5) / ROWS, v = col / COLS * TAU;
    if (mode === 0) {
      const lat = (u - .5) * Math.PI;
      points[index] = Math.cos(lat) * Math.cos(v); points[index + 1] = Math.sin(lat); points[index + 2] = Math.cos(lat) * Math.sin(v);
    } else if (mode === 1) {
      const angle = u * TAU, radius = .72 + .28 * Math.cos(angle);
      points[index] = radius * Math.cos(v); points[index + 1] = .28 * Math.sin(angle); points[index + 2] = radius * Math.sin(v);
    } else {
      const angle = u * TAU * 2.2, radius = .48 + .15 * Math.cos(v);
      points[index] = radius * Math.cos(angle); points[index + 1] = (u - .5) * 1.9 + .15 * Math.sin(v); points[index + 2] = radius * Math.sin(angle);
    }
  }
  return points;
});

export default function DataOrb() {
  const { reduced, finePointer } = usePortfolioMotion();
  const [mode, setMode] = useState(0);
  const canvasRef = useRef(null), modeRef = useRef(mode), redrawRef = useRef(null);
  const phaseRef = useRef(0), surfaceRef = useRef(null), pointerRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  useEffect(() => { modeRef.current = mode; redrawRef.current?.(); }, [mode]);
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    let width = 0, height = 0, frame = 0, visible = true, destroyed = false, lastTime = 0, elapsed = phaseRef.current;
    let bounds = canvas.getBoundingClientRect();
    if (!surfaceRef.current) surfaceRef.current = new Float32Array(shapes[modeRef.current]);
    const points = surfaceRef.current;
    const projected = Array.from({ length: COUNT }, () => ({ x: 0, y: 0, z: 0 }));
    const pointer = pointerRef.current;
    function cancel() { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    function schedule() { if (!frame && !destroyed && visible && !document.hidden && width && height) frame = requestAnimationFrame(draw); }
    function resize() {
      bounds = canvas.getBoundingClientRect(); width = bounds.width; height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, finePointer ? 1.75 : 1.35);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); schedule();
    }
    function move(event) {
      if (reduced || !finePointer || event.pointerType === 'touch') return;
      pointer.tx = (event.clientX - bounds.left) / width - .5; pointer.ty = (event.clientY - bounds.top) / height - .5;
    }
    function leave() { pointer.tx = 0; pointer.ty = 0; }
    function visibility() { if (document.hidden) cancel(); else schedule(); }
    function draw(time) {
      frame = 0;
      const delta = lastTime ? Math.min(time - lastTime, 50) : 16.7;
      lastTime = time; if (!reduced) elapsed += delta;
      phaseRef.current = elapsed;
      const blend = reduced ? 1 : 1 - Math.exp(-delta / 220);
      pointer.x += (pointer.tx - pointer.x) * blend; pointer.y += (pointer.ty - pointer.y) * blend;
      const target = shapes[modeRef.current], angle = .55 + elapsed * .000105 + pointer.x * .42;
      const tilt = -.25 + Math.sin(elapsed * .00017) * .13 + pointer.y * .30;
      const cos = Math.cos(angle), sin = Math.sin(angle), ct = Math.cos(tilt), st = Math.sin(tilt);
      const radius = Math.min(width, height) * .37, centerX = width * .51, centerY = height * .48;
      ctx.clearRect(0, 0, width, height);
      const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.65);
      glow.addColorStop(0, 'rgba(152,229,91,.09)'); glow.addColorStop(.5, 'rgba(121,187,89,.045)'); glow.addColorStop(1, 'rgba(83,147,84,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < COUNT; i++) {
        const j = i * 3;
        for (let axis = 0; axis < 3; axis++) points[j + axis] += (target[j + axis] - points[j + axis]) * blend;
        const x = points[j] * cos + points[j + 2] * sin, z = points[j + 2] * cos - points[j] * sin;
        const y = points[j + 1] * ct - z * st, depth = points[j + 1] * st + z * ct;
        const perspective = 3.8 / (3.8 - depth), p = projected[i];
        p.x = centerX + (x * .977 + y * .213) * radius * perspective;
        p.y = centerY + (y * .977 - x * .213) * radius * perspective; p.z = depth;
      }
      ctx.lineWidth = .55;
      for (let row = 0; row < ROWS; row++) {
        ctx.beginPath(); let depth = 0;
        for (let col = 0; col <= COLS; col++) {
          const p = projected[row * COLS + col % COLS]; depth += p.z;
          if (!col) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = `rgba(187,245,137,${.09 + Math.max(0, depth / COLS) * .23})`; ctx.stroke();
      }
      for (let col = 0; col < COLS; col += 2) {
        ctx.beginPath();
        for (let row = 0; row < ROWS; row++) {
          const p = projected[row * COLS + col]; if (!row) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(182,239,137,.095)'; ctx.stroke();
      }
      for (let i = 0; i < COUNT; i++) {
        const p = projected[i]; if (p.z < -.35 && i % 2) continue;
        ctx.fillStyle = `rgba(211,255,173,${.13 + Math.max(0, p.z) * .69})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.z > .45 ? 1.55 : .8, 0, TAU); ctx.fill();
      }
      for (let i = 0; i < 9; i++) {
        const p = projected[(i * 83 + Math.floor(elapsed * .004)) % COUNT]; if (p.z < 0) continue;
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9);
        halo.addColorStop(0, 'rgba(211,255,163,.6)'); halo.addColorStop(1, 'rgba(175,239,124,0)');
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(201,233,179,.13)'; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.ellipse(centerX, centerY, radius * 1.40, radius * .39, -.43, 0, TAU); ctx.stroke();
      const orbit = elapsed * .00032 + .8, ox = Math.cos(orbit) * radius * 1.4, oy = Math.sin(orbit) * radius * .39;
      ctx.fillStyle = '#d0ff9c'; ctx.beginPath();
      ctx.arc(centerX + ox * .91 + oy * .42, centerY + oy * .91 - ox * .42, 2.3, 0, TAU); ctx.fill();
      if (!reduced) schedule();
    }
    redrawRef.current = schedule;
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) schedule(); else cancel(); }, { rootMargin: '80px' }); observer.observe(canvas);
    canvas.addEventListener('pointermove', move, { passive: true }); canvas.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', visibility); resize();
    return () => {
      destroyed = true; cancel(); redrawRef.current = null; resizeObserver.disconnect(); observer.disconnect();
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave); document.removeEventListener('visibilitychange', visibility);
    };
  }, [reduced, finePointer]);
  return <div className="orb-composition">
    <div className="orb-reticle" aria-hidden="true"><span /><span /><span /><span /></div>
    <div className="orb-overline"><span className="status-dot" /> A DIFFERENT PERSPECTIVE</div>
    <canvas ref={canvasRef} className="data-orb" aria-hidden="true" />
    <div className="orb-coordinate orb-coordinate-top" aria-hidden="true">01 / INFINITE POSSIBILITIES</div>
    <div className="orb-coordinate orb-coordinate-bottom" aria-hidden="true">CURIOSITY, IN MOTION <ArrowUpRight size={12} /></div>
    <div className="orb-controls"><div className="orb-control-label"><span>Shape the signal</span><p>{modes[mode].caption}</p></div>
      <div role="group" aria-label="Explore the 3D artwork">{modes.map((item, i) => <button type="button" key={item.name}
        className={mode === i ? 'active' : ''} aria-pressed={mode === i} onClick={() => setMode(i)}>{item.name}</button>)}</div>
    </div>
  </div>;
}
