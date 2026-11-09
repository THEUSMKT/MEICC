/* Rede neural em canvas 2D (versao aprovada). Plano B sem WebGL ou com movimento reduzido. */
import { $ } from '../core/dom.js';
import { reduce } from '../core/env.js';

export function initNetFallback() {
  const cv = $('#net');
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d');
  const N = 84;
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const k = 0.8 + 0.2 * (((i * 37) % 11) / 10);
    pts.push({ x: Math.cos(th) * r * k, y: y * k, z: Math.sin(th) * r * k });
  }
  const edges = [];
  const adj = pts.map(() => []);
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const d = [];
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z;
      d.push([dx * dx + dy * dy + dz * dz, j]);
    }
    d.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < 3; k++) {
      const j = d[k][1];
      const a = Math.min(i, j), b = Math.max(i, j), key = a * 1000 + b;
      if (!seen.has(key)) { seen.add(key); edges.push([a, b]); adj[a].push(b); adj[b].push(a); }
    }
  }
  const pulses = [];
  for (let i = 0; i < 8; i++) {
    const from = (i * 11) % N;
    pulses.push({ a: from, b: adj[from][0], t: (i * 0.13) % 1, v: 0.35 + ((i * 7) % 5) * 0.08 });
  }
  let W = 0, H = 0, dpr = 1;
  let ay = 0.6, ax = -0.35, spin = 0.14;
  let dragging = false, lx = 0, ly = 0;
  let raf = 0, last = 0, visible = true;
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.max(1, Math.round(W * dpr));
    cv.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function project(p) {
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    let x = p.x * cy + p.z * sy, z = -p.x * sy + p.z * cy;
    const y = p.y * cx - z * sx; z = p.y * sx + z * cx;
    const f = 2.8 / (2.8 - z);
    const R = Math.min(W, H) * 0.4;
    return { x: W / 2 + x * R * f, y: H / 2 + y * R * f, z: z, f: f };
  }
  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    const P = pts.map(project);
    ctx.lineWidth = 1;
    for (const [a, b] of edges) {
      const za = (P[a].z + P[b].z) / 2;
      const al = 0.07 + 0.38 * ((za + 1) / 2);
      ctx.strokeStyle = 'rgba(143,163,199,' + al.toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); ctx.stroke();
    }
    for (let i = 0; i < N; i++) {
      const d = (P[i].z + 1) / 2;
      ctx.fillStyle = 'rgba(205,216,238,' + (0.3 + 0.65 * d).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(P[i].x, P[i].y, (1.4 + 2.4 * d) * P[i].f, 0, 6.2832); ctx.fill();
    }
    for (const s of pulses) {
      if (dt) {
        s.t += s.v * dt;
        if (s.t >= 1) {
          const opts = adj[s.b].filter(n => n !== s.a);
          const nx = opts.length ? opts[Math.floor(Math.random() * opts.length)] : s.a;
          s.a = s.b; s.b = nx; s.t = 0;
        }
      }
      const A = P[s.a], B = P[s.b];
      const x = A.x + (B.x - A.x) * s.t, y = A.y + (B.y - A.y) * s.t;
      const d = ((A.z + B.z) / 2 + 1) / 2;
      ctx.fillStyle = 'rgba(255,138,61,' + (0.18 + 0.2 * d).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, 9 * A.f, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,170,110,' + (0.65 + 0.35 * d).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, 3.2 * A.f, 0, 6.2832); ctx.fill();
    }
  }
  function frame(ts) {
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    if (!dragging) ay += spin * dt;
    draw(dt);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (reduce || raf || !visible || document.hidden) return; last = 0; raf = requestAnimationFrame(frame); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  size();
  draw(0);
  window.addEventListener('resize', () => { size(); draw(0); });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(cv);
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
  cv.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } });
  cv.addEventListener('pointermove', e => {
    if (!dragging) return;
    ay += (e.clientX - lx) * 0.008;
    ax = Math.max(-1.1, Math.min(1.1, ax + (e.clientY - ly) * 0.008));
    lx = e.clientX; ly = e.clientY;
    if (reduce) draw(0);
  });
  const end = () => { dragging = false; };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  start();
}
