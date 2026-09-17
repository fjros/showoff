import { useRef } from 'react';
import { ArrowUpRight, Play, Code2, GitBranch } from 'lucide-react';
import type { ProjectShowcase as Showcase } from '@/lib/model';

export function ProjectShowcase({ project }: { project: Showcase }) {
  const video = useRef<HTMLVideoElement>(null);
  const watch = () => {
    video.current?.scrollIntoView({ behavior: 'instant', block: 'center' });
    video.current?.focus({ preventScroll: true });
    void video.current?.play().catch(() => {
      /* Native controls remain available. */
    });
  };
  return (
    <section
      id="demo"
      className="project-showcase"
      aria-labelledby="project-title"
    >
      <div className="project-copy">
        <p className="eyebrow">{project.eyebrow}</p>
        <h2 id="project-title">{project.title}</h2>
        <p className="project-summary">{project.summary}</p>
        <ul className="project-technologies" aria-label="Project technologies">
          {project.technologies.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div className="project-actions">
          <a
            className="action primary-action"
            href={project.demoUrl}
            target="_blank"
            rel="noreferrer"
          >
            Explore the demo <ArrowUpRight size={17} />
          </a>
          <button className="action" onClick={watch}>
            <Play size={16} /> Watch walkthrough
          </button>
        </div>
        <div className="project-reading">
          <a href={project.repositoryUrl} target="_blank" rel="noreferrer">
            <Code2 size={16} /> View source <ArrowUpRight size={14} />
          </a>
          <a href={project.engineeringUrl} target="_blank" rel="noreferrer">
            <GitBranch size={16} /> Engineering decisions{' '}
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
      <figure className="project-film">
        <div className="project-film-label">
          <span className="project-status-dot" /> A working example
        </div>
        <video
          ref={video}
          controls
          playsInline
          preload="none"
          crossOrigin="anonymous"
          poster={project.video.posterUrl}
          aria-label={project.video.label}
          tabIndex={0}
        >
          <source src={project.video.url} type="video/mp4" />
          <track
            kind="captions"
            src={project.video.captionsUrl}
            srcLang="en"
            label="English"
          />
          Your browser cannot play this video.{' '}
          <a href={project.video.url}>Download the walkthrough</a>.
        </video>
        <figcaption>
          <span>{project.video.label}</span>
          <a
            href={project.video.transcriptUrl}
            target="_blank"
            rel="noreferrer"
          >
            Read transcript <ArrowUpRight size={13} />
          </a>
        </figcaption>
      </figure>
      <div className="project-scenarios" aria-label="Explore demo scenarios">
        {project.scenarios.map((s, i) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="project-scenario"
          >
            <span className="project-scenario-number">0{i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.description}</p>
            <ArrowUpRight className="project-scenario-arrow" size={19} />
          </a>
        ))}
      </div>
      <p className="project-replay-note">
        Interactive replays of recorded test runs. Synthetic funds. No setup
        required.
      </p>
    </section>
  );
}
