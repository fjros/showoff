'use client';
import { useEffect, useState } from 'react';

export function usePageMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [paused, setPaused] = useState(() => {
    try {
      return localStorage.getItem('showoff-motion') === 'paused';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  const toggle = () => {
    setPaused((value) => {
      const next = !value;
      try {
        localStorage.setItem('showoff-motion', next ? 'paused' : 'on');
      } catch {
        /* Keep working without storage. */
      }
      return next;
    });
  };
  return { enabled: !reduced && !paused, reduced, toggle };
}
