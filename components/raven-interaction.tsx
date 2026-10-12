'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

type Flight = { x: number; y: number; start: number; seed: number };

// A curved vane, a quill, and fine barbs; no bright particles or screen-wide filters.
function feather(ctx: CanvasRenderingContext2D, length: number, width: number, alpha: number) {
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-width * 0.64, -length * 0.2, -width * 0.7, -length * 0.68, 0, -length);
  ctx.bezierCurveTo(width * 0.52, -length * 0.68, width * 0.7, -length * 0.18, 0, 8);
  const fill = ctx.createLinearGradient(-width / 2, 0, width / 2, -length);
  fill.addColorStop(0, `rgba(120,176,218,${alpha})`);
  fill.addColorStop(0.55, `rgba(225,242,255,${alpha})`);
  fill.addColorStop(1, `rgba(154,204,239,${alpha})`);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = `rgba(58,114,157,${alpha * 0.45})`;
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.quadraticCurveTo(2, -length * 0.4, 0, -length);
  ctx.stroke();
  ctx.strokeStyle = `rgba(79,143,191,${alpha * 0.22})`;
  for (let i = 1; i < 14; i++) {
    const y = (-length * i) / 15;
    const spread = width * Math.sin((Math.PI * i) / 15) * 0.48;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(-spread, y - length * 0.09);
    ctx.moveTo(0, y);
    ctx.lineTo(spread, y - length * 0.07);
    ctx.stroke();
  }
}

export function RavenInteraction() {
  const ref = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const inWorkspace = pathname === '/app' || pathname.startsWith('/app/');
  useEffect(() => {
    if (inWorkspace) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let flights: Flight[] = [];
    let raf = 0;
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = innerWidth * scale;
      canvas.height = innerHeight * scale;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    };
    const frame = (now: number) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      flights = flights.filter((f) => now - f.start < 1650);
      for (const flight of flights) {
        const age = now - flight.start;
        const beat = Math.min(age / 540, 1);
        const opening = Math.sin(beat * Math.PI);
        // Two fans briefly unfurl from the button, then disappear into the loose feathers.
        if (beat < 1)
          for (const side of [-1, 1])
            for (let i = 0; i < 6; i++) {
              ctx.save();
              ctx.translate(flight.x + side * 20, flight.y + 4);
              ctx.rotate(side * (0.42 + i * 0.15 + opening * 0.42));
              ctx.scale(1, 0.3 + opening * 0.7);
              feather(ctx, 52 + i * 9, 14, opening * 0.72);
              ctx.restore();
            }
        const t = Math.max(0, age - 110) / 1450;
        if (t > 0 && t < 1)
          for (let i = 0; i < 9; i++) {
            const angle = i * 2.399 + flight.seed;
            const speed = 48 + (i % 4) * 20;
            const drift = 1 - Math.exp(-t * 3);
            const x = flight.x + Math.cos(angle) * speed * drift + Math.sin(t * 3 + i) * 8;
            const y =
              flight.y + Math.sin(angle) * speed * drift + t * t * 95 - 20 * Math.sin(t * Math.PI);
            const opacity = Math.sin((Math.min(t * 5, 1) * Math.PI) / 2) * (1 - t) * 0.86;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle * 0.4 + t * (i % 2 ? 1.1 : -0.9));
            ctx.scale(1, 0.65 + Math.abs(Math.cos(t * 3 + i)) * 0.35);
            feather(ctx, 18 + (i % 4) * 5, 7 + (i % 3), opacity);
            ctx.restore();
          }
      }
      raf = flights.length ? requestAnimationFrame(frame) : 0;
    };
    const click = (event: MouseEvent) => {
      if (reduced.matches || !(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLElement>('.button');
      if (!button || button.matches(':disabled, [aria-disabled="true"]')) return;
      const rect = button.getBoundingClientRect();
      flights.push({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        start: performance.now(),
        seed: Math.random() * 6,
      });
      flights = flights.slice(-3);
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (reduced.matches) {
        flights = [];
        cancelAnimationFrame(raf);
        raf = 0;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
      }
    };
    resize();
    document.addEventListener('click', click, { capture: true });
    window.addEventListener('resize', resize);
    reduced.addEventListener('change', stop);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('click', click, true);
      window.removeEventListener('resize', resize);
      reduced.removeEventListener('change', stop);
    };
  }, [inWorkspace]);
  return inWorkspace ? null : <canvas ref={ref} className="raven-flight" aria-hidden="true" />;
}
