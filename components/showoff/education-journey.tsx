import { ArrowUpRight } from 'lucide-react';
import type { ReaderEvidence } from '@/lib/reader';
import type { WorkLink } from '@/lib/model';

export function WorkLinks({ links }: { links?: WorkLink[] }) {
  if (!links?.length) return null;
  return (
    <ul className="work-links">
      {links.map((link, i) => (
        <li key={`${link.url}-${i}`}>
          <a href={link.url} target="_blank" rel="noreferrer">
            {link.label}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}
export function EducationJourney({
  qualifications,
}: {
  qualifications: ReaderEvidence[];
}) {
  return (
    <ol className="education-timeline" aria-label="Qualifications">
      {qualifications.map((qualification) => (
        <li key={qualification.id}>
          <p className="education-date">{qualification.date}</p>
          <h3>{qualification.title}</h3>
          <p className="education-institution">{qualification.organization}</p>
          <p className="education-result">{qualification.summary}</p>
          <WorkLinks links={qualification.links} />
        </li>
      ))}
    </ol>
  );
}
