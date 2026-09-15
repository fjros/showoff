import { ArrowUpRight, Plus } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { groupEntries, type ReaderEvidence } from '@/lib/reader';

export function ProjectTimeline({
  projects,
  onSelect,
}: {
  projects: ReaderEvidence[];
  onSelect: (entry: ReaderEvidence) => void;
}) {
  return (
    <ol className="project-timeline" aria-label="Research projects">
      {projects.map((project) => (
        <li key={project.id}>
          <button onClick={() => onSelect(project)}>
            <span className="project-copy">
              <span className="project-date">{project.date}</span>
              <strong>{project.title}</strong>
            </span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ol>
  );
}

export function ChapterEntries({
  entries,
  onSelect,
}: {
  entries: ReaderEvidence[];
  onSelect: (entry: ReaderEvidence) => void;
}) {
  return (
    <div className="chapter-entries">
      {groupEntries(entries).map(({ entry, projects }) =>
        projects.length ? (
          <Accordion key={entry.id} className="role-projects">
            <AccordionItem value={entry.id}>
              <AccordionTrigger className="role-trigger">
                <span className="entry-meta">{entry.date}</span>
                <span className="entry-copy">
                  <strong>{entry.title}</strong>
                  <span>{entry.organization}</span>
                  <span className="project-count">
                    {projects.length} research projects
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="role-project-content">
                  <button
                    className="role-overview"
                    onClick={() => onSelect(entry)}
                  >
                    About this role <ArrowUpRight size={16} />
                  </button>
                  <ProjectTimeline projects={projects} onSelect={onSelect} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          <button
            key={entry.id}
            className="standalone-entry"
            onClick={() => onSelect(entry)}
          >
            <span className="entry-meta">
              {entry.date ||
                (entry.kind === 'research' ? 'Research & service' : entry.kind)}
            </span>
            <span className="entry-copy">
              <strong>{entry.title}</strong>
              <span>{entry.organization}</span>
            </span>
            <Plus size={20} aria-hidden="true" />
          </button>
        ),
      )}
    </div>
  );
}
