import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

export default function DataOrb() {
  const canvasRef = useRef(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = 0, height = 0, frame = 0, visible = true;
    const pointer = { x: 0, y: 0 };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr; canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas); resize();
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }); observer.observe(canvas);
    const move = e => { const r = canvas.getBoundingClientRect(); pointer.x = (e.clientX - r.left) / r.width - 0.5; pointer.y = (e.clientY - r.top) / r.height - 0.5; };
    canvas.addEventListener('pointermove', move);
    function render(time = 0) {
      if (visible && !document.hidden) {
        ctx.clearRect(0, 0, width, height);
        const radius = Math.min(width, height) * 0.32;
        const angle = reduceMotion ? 0.7 : time * 0.00009 + pointer.x * 0.2;
        const tilt = -0.35 + pointer.y * 0.16;
        const project = (x, y, z) => {
          const rx = x * Math.cos(angle) + z * Math.sin(angle);
          const rz = z * Math.cos(angle) - x * Math.sin(angle);
          const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
          const zz = y * Math.sin(tilt) + rz * Math.cos(tilt);
          const perspective = 3.4 / (3.4 - zz);
          return { x: width / 2 + rx * radius * perspective, y: height / 2 + ry * radius * perspective, z: zz };
        };
        const glow = ctx.createRadialGradient(width * .49, height * .47, radius * .1, width / 2, height / 2, radius * 1.5);
        glow.addColorStop(0, 'rgba(108,177,61,.09)'); glow.addColorStop(.7, 'rgba(73,138,65,.04)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
        const rings = [];
        for (let i = 1; i < 25; i++) {
          const latitude = -Math.PI / 2 + (i / 25) * Math.PI;
          const points = Array.from({ length: 97 }, (_, j) => { const a = j / 96 * Math.PI * 2; return project(Math.cos(latitude) * Math.cos(a), Math.sin(latitude), Math.cos(latitude) * Math.sin(a)); });
          rings.push(points);
        }
        for (let i = 0; i < 40; i++) {
          const a = i / 40 * Math.PI * 2;
          rings.push(Array.from({ length: 65 }, (_, j) => { const lat = -Math.PI / 2 + j / 64 * Math.PI; return project(Math.cos(lat) * Math.cos(a), Math.sin(lat), Math.cos(lat) * Math.sin(a)); }));
        }
        for (const points of rings) {
          for (let j = 1; j < points.length; j++) {
            const p = points[j - 1], q = points[j], depth = (p.z + q.z) / 2;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = depth > 0 ? `rgba(185,245,107,${.17 + depth * .46})` : `rgba(124,166,129,${.055 + (depth + 1) * .07})`;
            ctx.lineWidth = depth > 0.4 ? 0.9 : 0.55; ctx.stroke();
          }
        }
        for (let i = 0; i < 22; i++) {
          const a = i * 2.39996, y = 1 - i / 21 * 2, r = Math.sqrt(1 - y * y);
          const p = project(r * Math.cos(a), y, r * Math.sin(a));
          if (p.z < 0) continue;
          ctx.fillStyle = '#d2ffa4'; ctx.shadowColor = '#b9f56b'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.z * 1.7 + 1, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
        ctx.strokeStyle = 'rgba(177,205,183,.14)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(width / 2, height / 2, radius * 1.34, radius * .46, -.48, 0, Math.PI * 2); ctx.stroke();
      }
      if (!reduceMotion) frame = requestAnimationFrame(render);
    }
    frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); resizeObserver.disconnect(); observer.disconnect(); canvas.removeEventListener('pointermove', move); };
  }, [reduceMotion]);
  return <div className="orb-composition" aria-hidden="true"><div className="orb-crosshair crosshair-one" /><div className="orb-crosshair crosshair-two" /><div className="orb-overline">THE WORLD, THROUGH DATA</div><canvas ref={canvasRef} className="data-orb" /><div className="orb-caption"><span className="status-dot" /> Connecting patterns. Finding clarity.</div><div className="orb-label orb-label-top"><span>INPUT</span>Questions & curiosity <i /></div><div className="orb-label orb-label-bottom"><span>OUTPUT</span>Decisions with direction <i /></div><div className="orb-coordinates">PATTERNS → SIGNALS &nbsp; / &nbsp; ANALYSIS IN MOTION</div></div>;
}
