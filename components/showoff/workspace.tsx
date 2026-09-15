'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Pause, Play, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { Chapter } from '@/lib/model';
import type { ReaderEvidence, ReaderProfile } from '@/lib/reader';
import { EducationJourney, WorkLinks } from './education-journey';
import { ChapterEntries, ProjectTimeline } from './chapter-entries';
import { skillGroups } from '@/lib/expertise';
import { ExpertiseExplorer } from './expertise-explorer';
import { usePageMotion } from './use-page-motion';
import { CareerAtlas } from './career-atlas';

// Older application snapshots have no editorial chapter data. Group only the
// records in that snapshot; never fetch the owner's wider career as a fallback.
function chaptersFor(profile: ReaderProfile): Chapter[] {
  if (profile.chapters.length) return profile.chapters;
  const groups = new Map<string, ReaderEvidence[]>();
  for (const entry of profile.evidence.filter(
    (e) => e.kind !== 'language' && e.kind !== 'education',
  )) {
    const entries = groups.get(entry.organization) ?? [];
    entries.push(entry);
    groups.set(entry.organization, entries);
  }
  return [...groups.entries()].map(([organization, entries], i) => ({
    id: `chapter-${i}`,
    title: organization,
    period: entries[0].date ?? '',
    summary: entries[0].summary,
    highlights: [],
    evidenceIds: entries.map((e) => e.id),
  }));
}

export function CareerStory({
  profile,
  company,
  role,
}: {
  profile: ReaderProfile;
  company?: string;
  role?: string;
}) {
  const chapters = chaptersFor(profile);
  const motion = usePageMotion();
  const [active, setActive] = useState(chapters[0]?.id ?? '');
  const [selected, setSelected] = useState<ReaderEvidence | null>(null);
  const [selectedSkill, setSelectedSkill] = useState('');
  const exploreSkill = (skill: string) => {
    setSelected(null);
    setSelectedSkill(skill);
    requestAnimationFrame(() =>
      document
        .getElementById('expertise')
        ?.scrollIntoView({ behavior: 'instant' }),
    );
  };
  const titleRef = useRef<HTMLHeadingElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 });
    if (selected) titleRef.current?.focus({ preventScroll: true });
  }, [selected]);
  const education = profile.evidence.filter((e) => e.kind === 'education');
  const showingEducation = selected?.kind === 'education';
  const parentRole = profile.evidence.find((e) => e.id === selected?.parentId);
  const selectedProjects = chapters
    .flatMap((c) => c.evidenceIds)
    .filter((id, index, ids) => ids.indexOf(id) === index)
    .flatMap((id) => {
      const project = profile.evidence.find(
        (e) => e.id === id && e.parentId === selected?.id,
      );
      return project ? [project] : [];
    });
  const languages = profile.evidence.filter((e) => e.kind === 'language');
  useEffect(() => {
    const entrance = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-arrived', 'true');
            entrance.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' },
    );
    document
      .querySelectorAll(
        '.career-chapter, .expertise-section, .education-invitation',
      )
      .forEach((el) => entrance.observe(el));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -55% 0px' },
    );
    document
      .querySelectorAll('[data-career-chapter]')
      .forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      entrance.disconnect();
    };
  }, [profile]);
  return (
    <div className="career-page" data-motion={motion.enabled ? 'on' : 'off'}>
      <a href="#journey" className="skip-link">
        Skip to career story
      </a>
      <header className="topbar">
        <a className="personal-name" href="#top">
          {profile.name}
        </a>
        <nav aria-label="Main navigation">
          <a href="#journey">Story</a>
          <a href="#expertise">Skills & tools</a>
          {education.length > 0 && (
            <button onClick={() => setSelected(education[0])}>
              Education <ArrowUpRight size={15} />
            </button>
          )}
        </nav>
      </header>
      <main id="top">
        <CareerAtlas
          profile={profile}
          chapters={chapters}
          company={company}
          role={role}
          motion={motion.enabled}
          motionControl={
            <button
              className="motion-toggle"
              onClick={motion.toggle}
              disabled={motion.reduced}
              aria-label={
                motion.reduced
                  ? 'Reduced motion enabled by your device'
                  : motion.enabled
                    ? 'Pause animations'
                    : 'Enable animations'
              }
              title={
                motion.reduced
                  ? 'Your device prefers reduced motion'
                  : undefined
              }
            >
              {motion.enabled ? <Pause size={14} /> : <Play size={14} />}
              <span>{motion.enabled ? 'Motion on' : 'Motion off'}</span>
            </button>
          }
        />
        <div className="journey-layout" id="journey">
          <aside className="chapter-index">
            <p className="eyebrow">The journey</p>
            <nav aria-label="Chapters">
              {chapters.map((chapter, i) => (
                <a
                  key={chapter.id}
                  href={`#${chapter.id}`}
                  aria-current={active === chapter.id ? 'location' : undefined}
                  className={`chapter-color-${i % 5}`}
                >
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {chapter.title}
                </a>
              ))}
            </nav>
          </aside>
          <div className="chapters">
            {chapters.map((chapter, i) => {
              const entries = chapter.evidenceIds.flatMap((id) => {
                const entry = profile.evidence.find((e) => e.id === id);
                return entry ? [entry] : [];
              });
              return (
                <section
                  id={chapter.id}
                  data-career-chapter
                  key={chapter.id}
                  className={`career-chapter chapter-color-${i % 5}`}
                  aria-labelledby={`${chapter.id}-title`}
                >
                  <div className="chapter-heading">
                    <span className="chapter-number" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="eyebrow">{chapter.period}</p>
                      <h2 id={`${chapter.id}-title`}>{chapter.title}</h2>
                    </div>
                  </div>
                  <p className="chapter-summary">{chapter.summary}</p>
                  {chapter.highlights.length > 0 && (
                    <ul className="chapter-highlights">
                      {chapter.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  )}
                  <div
                    className="chapter-skill-preview"
                    aria-label="Skills in this chapter"
                  >
                    {(
                      chapter.featuredSkills ?? [
                        ...new Set(
                          entries.flatMap(
                            (e) => e.skills?.flatMap((g) => g.items) ?? [],
                          ),
                        ),
                      ]
                    )
                      .slice(0, 6)
                      .map((skill) => (
                        <button key={skill} onClick={() => exploreSkill(skill)}>
                          {skill}
                          <ArrowUpRight size={12} />
                        </button>
                      ))}
                  </div>
                  {entries.length > 0 && (
                    <div className="chapter-work">
                      <p className="eyebrow">Roles & work</p>
                      <ChapterEntries
                        entries={entries}
                        onSelect={setSelected}
                      />
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
        <ExpertiseExplorer
          entries={profile.evidence}
          settings={profile.skillMap}
          chapters={chapters}
          selectedSkill={selectedSkill}
          onSkill={setSelectedSkill}
          onSelect={setSelected}
        />
        {education.length > 0 && (
          <section className="education-invitation">
            <div>
              <p className="eyebrow">The academic foundation</p>
              <h2>{education[0].title}</h2>
              <p>
                {education[0].organization} · {education[0].date}
              </p>
            </div>
            <button
              className="action"
              onClick={() => setSelected(education[0])}
            >
              Explore education <ArrowUpRight size={18} />
            </button>
          </section>
        )}
      </main>
      <footer className="page-footer">
        <span>{profile.name}</span>
        {languages.map((language) => (
          <span key={language.id}>{language.summary}</span>
        ))}
        <a href="#top">Back to the beginning ↑</a>
      </footer>
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent
          className="career-detail-sheet"
          initialFocus={titleRef}
          showCloseButton={false}
        >
          <div className="detail-toolbar">
            <span>
              {showingEducation ? 'Education' : selected?.organization}
            </span>
            <SheetClose className="detail-close" aria-label="Close details">
              <X size={20} />
            </SheetClose>
          </div>
          <div className="career-detail-scroll" ref={detailRef}>
            <SheetHeader>
              {parentRole && (
                <button
                  className="project-breadcrumb"
                  onClick={() => setSelected(parentRole)}
                >
                  <ArrowLeft size={16} />
                  {parentRole.title}
                </button>
              )}
              <p className="eyebrow">
                {showingEducation
                  ? 'The academic journey'
                  : selected?.organization}
              </p>
              <SheetTitle className="detail-title" ref={titleRef} tabIndex={-1}>
                {showingEducation ? 'Education' : selected?.title}
              </SheetTitle>
              <SheetDescription>
                {showingEducation
                  ? `${education.length} qualifications`
                  : selected?.date || 'Professional background'}
              </SheetDescription>
            </SheetHeader>
            {showingEducation ? (
              <EducationJourney qualifications={education} />
            ) : (
              selected && (
                <div className="detail-body">
                  {selected.summary.split(/\n\n+/).map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                  {skillGroups(selected).length > 0 && (
                    <div className="detail-skills">
                      <h3>Skills & tools</h3>
                      {skillGroups(selected).map((group) => (
                        <section key={group.category}>
                          <h4>{group.category}</h4>
                          <div className="skill-chips">
                            {group.items.map((skill) => (
                              <button
                                key={skill}
                                onClick={() => exploreSkill(skill)}
                              >
                                {skill}
                                <ArrowUpRight size={12} />
                              </button>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                  <WorkLinks links={selected.links} />
                  {selectedProjects.length > 0 && (
                    <section className="role-detail-projects">
                      <h3>Research projects</h3>
                      <ProjectTimeline
                        projects={selectedProjects}
                        onSelect={setSelected}
                      />
                    </section>
                  )}
                </div>
              )
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
