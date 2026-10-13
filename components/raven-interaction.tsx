'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';

type Flight = { id: number; x: number; y: number; width: number };

export function RavenInteraction() {
  const sequence = useRef(0);
  const [flights, setFlights] = useState<Flight[]>([]);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
    const click = (event: MouseEvent) => {
      if (reduced.matches || !(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLElement>('.button');
      if (!button || button.matches(':disabled, [aria-disabled="true"]')) return;
      const rect = button.getBoundingClientRect();
      const flight = {
        id: ++sequence.current,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: Math.min(310, Math.max(200, rect.width * 1.2)),
      };
      setFlights((current) => [...current.slice(-2), flight]);
      const pending = timers.get(button);
      if (pending) clearTimeout(pending);
      button.classList.add('wing-press');
      timers.set(
        button,
        setTimeout(() => {
          button.classList.remove('wing-press');
          timers.delete(button);
        }, 560),
      );
    };
    const stop = () => {
      if (reduced.matches) setFlights([]);
    };
    document.addEventListener('click', click, { capture: true });
    reduced.addEventListener('change', stop);
    return () => {
      document.removeEventListener('click', click, true);
      reduced.removeEventListener('change', stop);
      for (const [button, timer] of timers) {
        clearTimeout(timer);
        button.classList.remove('wing-press');
      }
    };
  }, []);
  return (
    <div className="raven-flight" aria-hidden="true">
      {flights.map((flight) => (
        <span
          key={flight.id}
          className="raven-click-wings"
          style={{ left: flight.x, top: flight.y, width: flight.width }}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget)
              setFlights((current) => current.filter((item) => item.id !== flight.id));
          }}
        >
          <span className="raven-click-wing raven-click-wing-left" />
          <span className="raven-click-wing raven-click-wing-right" />
          {Array.from({ length: 8 }, (_, index) => {
            const angle = index * 2.399 + flight.id * 0.6;
            const distance = 48 + (index % 4) * 15;
            return (
              <svg
                key={index}
                className="raven-click-feather"
                viewBox="0 0 20 44"
                style={
                  {
                    '--feather-x': `${Math.cos(angle) * distance}px`,
                    '--feather-y': `${Math.sin(angle) * distance + 24}px`,
                    '--feather-angle': `${angle}rad`,
                    '--feather-spin': `${angle + (index % 2 ? 1.2 : -1.2)}rad`,
                    width: 10 + (index % 3) * 3,
                    animationDelay: `${index * 14}ms`,
                  } as CSSProperties
                }
              >
                <path
                  d="M10 2C1 12 0 29 8 36C17 32 20 13 10 2Z"
                  fill="currentColor"
                  fillOpacity=".65"
                />
                <path
                  d="M7 42Q10 24 10 4M9 15L5 12M9 20L4 17M9 26L4 23M10 13L14 9M10 19L16 14M10 25L16 21M9 31L14 27"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth=".8"
                />
              </svg>
            );
          })}
        </span>
      ))}
    </div>
  );
}
