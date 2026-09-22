'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  MoveUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Chapter } from '@/lib/model';
import type { ReaderProfile } from '@/lib/reader';

export function CareerAtlas({
  profile,
  chapters,
  company,
  role,
  motion,
  motionControl,
}: {
  profile: ReaderProfile;
  chapters: Chapter[];
  company?: string;
  role?: string;
  motion: boolean;
  motionControl: ReactNode;
}) {
  const [focused, setFocused] = useState(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLButtonElement | null)[]>([]);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting),
    );
    if (sceneRef.current) observer.observe(sceneRef.current);
    const sync = () => setPageVisible(!document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  const select = (index: number) =>
    setFocused((index + chapters.length) % chapters.length);
  const chapter = chapters[focused];
  const names = profile.headline.split('\n');
  const showcaseLeads =
    profile.showcase && profile.showcase.placement !== 'after-story';
  return (
    <section className="atlas-opening" aria-labelledby="story-title">
      <div className="atlas-intro">
        <div className="atlas-copy">
          <p className="eyebrow">
            {company ? `For ${company} / ${role ?? ''}` : profile.location}
          </p>
          <h1 id="story-title">
            {names.map((line, i) => (
              <span key={i}>
                {i === names.length - 1 && names.length > 1 ? (
                  <em>{line}</em>
                ) : (
                  line
                )}
              </span>
            ))}
          </h1>
          <p className="atlas-description">{profile.introduction}</p>
          <div className="atlas-actions">
            <a
              className="action primary-action"
              href={showcaseLeads ? '#demo' : '#journey'}
            >
              {showcaseLeads ? 'See the project' : 'Read the story'}{' '}
              <ArrowDown size={18} />
            </a>
            <a className="action" href="#expertise">
              Explore skills <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
        {chapter && (
          <div
            ref={sceneRef}
            className={`atlas-focus chapter-color-${focused % 5}`}
            data-running={motion && inView && pageVisible}
          >
            <div className="atlas-coordinate">
              {motionControl}
              <span>
                {String(focused + 1).padStart(2, '0')} /{' '}
                {String(chapters.length).padStart(2, '0')}
              </span>
            </div>
            <div
              className="orbit-stage"
              onPointerMove={(e) => {
                if (!motion || e.pointerType !== 'mouse') return;
                const rect = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty(
                  '--orbit-x',
                  `${((e.clientX - rect.left) / rect.width - 0.5) * 10}deg`,
                );
                e.currentTarget.style.setProperty(
                  '--orbit-y',
                  `${-((e.clientY - rect.top) / rect.height - 0.5) * 10}deg`,
                );
              }}
              onPointerLeave={(e) => {
                e.currentTarget.style.setProperty('--orbit-x', '0deg');
                e.currentTarget.style.setProperty('--orbit-y', '0deg');
              }}
            >
              <svg
                className="orbital-field"
                viewBox="0 0 400 320"
                aria-hidden="true"
              >
                <defs>
                  <radialGradient id="orbital-glow">
                    <stop
                      offset="0%"
                      stopColor="currentColor"
                      stopOpacity=".18"
                    />
                    <stop
                      offset="100%"
                      stopColor="currentColor"
                      stopOpacity="0"
                    />
                  </radialGradient>
                </defs>
                <circle
                  className="orbit-halo"
                  cx="200"
                  cy="160"
                  r="145"
                  fill="url(#orbital-glow)"
                />
                <g className="orbit-ring orbit-ring-one">
                  <ellipse cx="200" cy="160" rx="164" ry="87" />
                  <ellipse
                    className="orbit-tracer"
                    cx="200"
                    cy="160"
                    rx="164"
                    ry="87"
                  />
                </g>
                <g className="orbit-ring orbit-ring-two">
                  <ellipse
                    cx="200"
                    cy="160"
                    rx="164"
                    ry="87"
                    transform="rotate(60 200 160)"
                  />
                  <ellipse
                    className="orbit-tracer"
                    cx="200"
                    cy="160"
                    rx="164"
                    ry="87"
                    transform="rotate(60 200 160)"
                  />
                </g>
                <g className="orbit-ring orbit-ring-three">
                  <ellipse
                    cx="200"
                    cy="160"
                    rx="164"
                    ry="87"
                    transform="rotate(120 200 160)"
                  />
                  <ellipse
                    className="orbit-tracer"
                    cx="200"
                    cy="160"
                    rx="164"
                    ry="87"
                    transform="rotate(120 200 160)"
                  />
                </g>
                {chapters.map((c, i) => {
                  const a = (i * Math.PI * 2) / chapters.length - Math.PI / 2;
                  return (
                    <line
                      key={c.id}
                      className="orbit-spoke"
                      data-selected={i === focused}
                      x1="200"
                      y1="160"
                      x2={200 + 152 * Math.cos(a)}
                      y2={160 + 123 * Math.sin(a)}
                    />
                  );
                })}
              </svg>
              <a
                className="orbit-core"
                href={`#${chapter.id}`}
                aria-label={`Read chapter ${focused + 1}: ${chapter.title}`}
              >
                <span key={chapter.id}>
                  {String(focused + 1).padStart(2, '0')}
                </span>
                <small>Explore ↗</small>
              </a>
              <div
                className="orbit-nodes"
                // A labelled group of interactive chapter buttons, not a form fieldset.
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
                role="group"
                aria-label="Choose a career chapter"
              >
                {chapters.map((c, i) => {
                  const a = (i * Math.PI * 2) / chapters.length - Math.PI / 2;
                  return (
                    <button
                      key={c.id}
                      ref={(el) => {
                        nodes.current[i] = el;
                      }}
                      className={`orbit-node chapter-color-${i % 5}`}
                      style={{
                        left: `${50 + 38 * Math.cos(a)}%`,
                        top: `${50 + 38.4 * Math.sin(a)}%`,
                      }}
                      aria-label={`Preview chapter ${i + 1}: ${c.title}`}
                      aria-pressed={focused === i}
                      title={c.title}
                      onClick={() => select(i)}
                      onKeyDown={(e) => {
                        const delta =
                          e.key === 'ArrowRight' || e.key === 'ArrowDown'
                            ? 1
                            : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                              ? -1
                              : 0;
                        if (delta) {
                          e.preventDefault();
                          const next =
                            (i + delta + chapters.length) % chapters.length;
                          select(next);
                          nodes.current[next]?.focus();
                        }
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>
            <div key={chapter.id} className="atlas-chapter-caption">
              <p className="eyebrow">{chapter.period}</p>
              <h2>{chapter.title}</h2>
              <p className="atlas-focus-highlight">{chapter.highlights[0]}</p>
              <a href={`#${chapter.id}`}>
                Explore this chapter <MoveUpRight size={18} />
              </a>
            </div>
            <div className="orbit-controls">
              <button
                onClick={() => select(focused - 1)}
                aria-label="Previous chapter"
                disabled={chapters.length < 2}
              >
                <ChevronLeft size={18} />
              </button>
              <span>Choose a point to explore</span>
              <button
                onClick={() => select(focused + 1)}
                aria-label="Next chapter"
                disabled={chapters.length < 2}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <output className="sr-only">
              Chapter {focused + 1}: {chapter.title}
            </output>
          </div>
        )}
      </div>
      <nav className="atlas-route" aria-label="Career at a glance">
        {chapters.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setFocused(i)}
            aria-pressed={focused === i}
            className={`atlas-stop chapter-color-${i % 5}`}
          >
            <span className="route-head">
              <span className="route-number">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{c.period}</span>
            </span>
            <strong>{c.title}</strong>
            <span className="route-org">
              {
                profile.evidence.find(
                  (e) =>
                    c.evidenceIds.includes(e.id) && e.kind === 'experience',
                )?.organization
              }
            </span>
          </button>
        ))}
      </nav>
    </section>
  );
}
