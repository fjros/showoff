'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Search,
  X,
  Layers,
  Network,
  ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  expertiseIndex,
  connectionRoles,
  skillMatches,
  resolveSkill,
  orderSkills,
  matchingDetail,
} from '@/lib/expertise';
import type { ReaderEvidence } from '@/lib/reader';
import type { SkillMapSettings } from '@/lib/skill-map';
import type { Chapter } from '@/lib/model';

export function ExpertiseExplorer({
  entries,
  chapters,
  settings,
  selectedSkill,
  onSkill,
  onSelect,
}: {
  entries: ReaderEvidence[];
  chapters: Chapter[];
  settings?: SkillMapSettings;
  selectedSkill: string;
  onSkill: (skill: string) => void;
  onSelect: (entry: ReaderEvidence) => void;
}) {
  const [view, setView] = useState('map');
  const [context, setContext] = useState({ label: '', group: '' });
  const explorerRef = useRef<HTMLElement>(null);
  const tableScrollRef = useRef<HTMLElement>(null);
  const [comparison, setComparison] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!selectedSkill) return;
    const frame = requestAnimationFrame(() => {
      setView('map');
      const skill = resolveSkill(
        expertiseIndex(entries, settings),
        selectedSkill,
      );
      if (skill && !skillMatches(skill, query, category)) {
        setQuery('');
        setCategory('');
      }
      const panels =
        explorerRef.current?.querySelectorAll<HTMLElement>(
          '.skill-connections',
        );
      const visible = Array.from(panels ?? []).find(
        (p) => p.getClientRects().length && p.offsetParent !== null,
      );
      visible?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedSkill, entries, settings, query, category, comparison]);
  const [sort, setSort] = useState('featured');
  const skills = orderSkills(
    expertiseIndex(entries, settings),
    entries,
    settings?.featured ?? [],
    sort,
  );
  const categories = [...new Set(skills.flatMap((s) => s.categories))].sort();
  const filtered = skills.filter((s) => skillMatches(s, query, category));
  const searchGroup =
    resolveSkill(filtered, query.trim()) ??
    (filtered.length === 1 && matchingDetail(filtered[0], query)
      ? filtered[0]
      : undefined);
  const active =
    resolveSkill(
      skills,
      selectedSkill,
      context.label === selectedSkill ? context.group : undefined,
    ) ?? searchGroup;
  const activeDetail =
    active &&
    (selectedSkill
      ? active.details?.find(
          (d) =>
            d.label.toLowerCase() === selectedSkill.toLowerCase() &&
            d.label.toLowerCase() !== active.label.toLowerCase(),
        )
      : matchingDetail(active, query));
  const related = active
    ? connectionRoles(activeDetail ?? active, entries)
    : [];
  const rowConnection = (skill: (typeof skills)[number]) =>
    (active?.label === skill.label && activeDetail) ||
    matchingDetail(skill, query) ||
    skill;
  const columns = chapters.map((c, i) => ({
    chapter: c,
    index: i,
    organization:
      entries.find(
        (e) => c.evidenceIds.includes(e.id) && e.kind === 'experience',
      )?.organization ?? c.title,
  }));
  const featured = settings?.featured;
  const featuredLabels = featured ?? skills.slice(0, 12).map((s) => s.label);
  const isFeatured = (label: string) =>
    featuredLabels.some((f) => f.toLowerCase() === label.toLowerCase());
  const limited = !expanded && !query && !category && sort === 'featured';
  const shown = limited
    ? featured
      ? filtered.filter((s) =>
          featured.some((f) => f.toLowerCase() === s.label.toLowerCase()),
        )
      : filtered.slice(0, 12)
    : filtered;
  const displayedRows = JSON.stringify(shown.map((s) => s.label));
  const featuredRows = JSON.stringify(featuredLabels);
  useEffect(() => {
    const container = tableScrollRef.current;
    const table = container?.querySelector('table');
    if (!container || !table) return;
    const rows = Array.from(
      table.querySelectorAll<HTMLElement>('tbody tr[data-featured-row="true"]'),
    );
    const expected = JSON.parse(featuredRows).length;
    const measure = () => {
      // Filtered searches can omit featured rows; keep the last full measurement.
      if (!table.offsetWidth || rows.length !== expected || !rows.length)
        return;
      const height =
        (table.tHead?.getBoundingClientRect().height ?? 0) +
        rows.reduce((sum, row) => sum + row.getBoundingClientRect().height, 0) +
        container.offsetHeight -
        container.clientHeight;
      container.style.setProperty(
        '--featured-table-height',
        `${Math.ceil(height)}px`,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    rows.forEach((row) => observer.observe(row));
    measure();
    return () => observer.disconnect();
  }, [displayedRows, featuredRows, view, comparison]);
  const roles = entries.filter(
    (e) =>
      e.kind === 'experience' ||
      (e.kind === 'research' && !entries.some((p) => p.id === e.parentId)),
  );
  const clear = () => {
    setQuery('');
    setCategory('');
    onSkill('');
    setExpanded(false);
  };
  const selectSkill = (label: string, group = label) => {
    setContext({ label, group });
    setQuery('');
    onSkill(label);
  };
  const mobileShown =
    active && !shown.some((s) => s.label === active.label)
      ? [active, ...shown]
      : shown;
  const connectionsPanel = () =>
    active && (
      <div className="skill-connections" aria-live="polite">
        <div className="connection-heading">
          <div>
            <p className="eyebrow">
              Used across {related.length}{' '}
              {related.length === 1 ? 'role' : 'roles'}
            </p>
            <h3>{active.label}</h3>
          </div>
          <button
            className="icon-button"
            onClick={() => {
              onSkill('');
              setQuery('');
            }}
            aria-label="Close skill connections"
          >
            <X size={20} />
          </button>
        </div>
        {active.details && (
          <div
            className="skill-chips group-tools"
            aria-label={`${active.label} tools`}
          >
            <button
              aria-pressed={!activeDetail}
              onClick={() => selectSkill(active.label)}
            >
              All experience
            </button>
            {active.details
              .filter(
                (d) => d.label.toLowerCase() !== active.label.toLowerCase(),
              )
              .map((d) => (
                <button
                  key={d.label}
                  aria-pressed={activeDetail?.label === d.label}
                  onClick={() => selectSkill(d.label, active.label)}
                >
                  {d.label}
                </button>
              ))}
          </div>
        )}
        {activeDetail && (
          <p className="tool-focus">
            Showing experience with {activeDetail.label}
          </p>
        )}
        {activeDetail &&
          skills.some(
            (s) =>
              s.label !== active.label &&
              s.details?.some((d) => d.label === activeDetail.label),
          ) && (
            <div
              className="skill-chips group-tools"
              aria-label="Other groups for this skill"
            >
              <span>Also in</span>
              {skills
                .filter(
                  (s) =>
                    s.label !== active.label &&
                    s.details?.some((d) => d.label === activeDetail.label),
                )
                .map((s) => (
                  <button
                    key={s.label}
                    onClick={() => selectSkill(activeDetail.label, s.label)}
                  >
                    {s.label}
                  </button>
                ))}
            </div>
          )}
        <div className="connection-cards">
          {related.map(({ role, sources }) => (
            <button
              key={role.id}
              className={`connection-card chapter-color-${
                Math.max(
                  0,
                  chapters.findIndex((c) => c.evidenceIds.includes(role.id)),
                ) % 5
              }`}
              onClick={() => onSelect(role)}
            >
              <span>{role.organization}</span>
              <strong>{role.title}</strong>
              <small>{role.date}</small>
              {active.details && (
                <small className="connection-tools">
                  {(activeDetail ? [activeDetail] : active.details)
                    .filter((d) =>
                      d.entries.some((e) =>
                        sources.some((source) => source.id === e.id),
                      ),
                    )
                    .map((d) => d.label)
                    .join(' · ')}
                </small>
              )}
              {!sources.some((s) => s.id === role.id) && (
                <small>
                  Including{' '}
                  {sources
                    .filter((s) => s.id !== role.id)
                    .map((s) => s.title)
                    .join(', ')}
                </small>
              )}
              <ArrowUpRight size={20} />
            </button>
          ))}
        </div>
      </div>
    );
  return (
    <section
      id="expertise"
      ref={explorerRef}
      data-comparison={comparison}
      className="expertise-section"
      aria-labelledby="expertise-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">The experience behind the story</p>
          <h2 id="expertise-title">
            Skills, <em>connected.</em>
          </h2>
        </div>
        <p>
          Follow a skill across roles.
          <br />
          Open a connection to see the work.
        </p>
      </div>
      <div className="expertise-controls">
        <label className="skill-search">
          <Search size={20} />
          <span className="sr-only">Search skills, tools or roles</span>
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSkill('');
            }}
            placeholder="Search skills, tools or roles…"
          />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery('')}>
              <X size={18} />
            </button>
          )}
        </label>
        <label className="category-select">
          <span className="sr-only">Skill category</span>
          <NativeSelect
            aria-label="Skill category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              onSkill('');
            }}
          >
            <NativeSelectOption value="">All disciplines</NativeSelectOption>
            {categories.map((c) => (
              <NativeSelectOption key={c}>{c}</NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="category-select" htmlFor="skill-map-order">
          <span className="sr-only">Skill order</span>
          <NativeSelect
            aria-label="Skill order"
            id="skill-map-order"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <NativeSelectOption value="featured">
              Featured first
            </NativeSelectOption>
            <NativeSelectOption value="alphabetical">
              Alphabetical
            </NativeSelectOption>
            <NativeSelectOption value="roles">Most roles</NativeSelectOption>
          </NativeSelect>
        </label>
      </div>
      <Tabs
        value={view}
        onValueChange={(value) => setView(String(value))}
        className="expertise-tabs"
      >
        <div className="expertise-toolbar">
          <TabsList>
            <TabsTrigger value="map">
              <Network size={16} /> Skill map
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Layers size={16} /> By role
            </TabsTrigger>
          </TabsList>
          <output>
            {view === 'map' && limited
              ? `Featured selection · ${shown.length} of ${filtered.length}`
              : filtered.length}{' '}
            {filtered.length === 1 ? 'skill or tool' : 'skills & tools'}
          </output>
        </div>
        <TabsContent value="map">
          <div className="mobile-map-mode">
            <button
              aria-pressed={!comparison}
              onClick={() => setComparison(false)}
            >
              Skill cards
            </button>
            <button
              aria-pressed={comparison}
              onClick={() => setComparison(true)}
            >
              Comparison table
            </button>
          </div>
          <div className="map-desktop-connections">{connectionsPanel()}</div>
          <div className="mobile-skill-cards">
            {mobileShown.map((skill) => {
              const connected = connectionRoles(rowConnection(skill), entries);
              const organizations = [
                ...new Set(connected.map((c) => c.role.organization)),
              ];
              const isOpen = active?.label === skill.label;
              const index = skills.findIndex((s) => s.label === skill.label);
              return (
                <article
                  className="mobile-skill-card"
                  key={skill.label}
                  data-selected={isOpen}
                >
                  <button
                    className="mobile-skill-trigger"
                    aria-expanded={isOpen}
                    aria-controls={`mobile-skill-${index}`}
                    onClick={() => {
                      if (isOpen) {
                        onSkill('');
                        setQuery('');
                      } else
                        selectSkill(rowConnection(skill).label, skill.label);
                    }}
                  >
                    <span>
                      <strong>{skill.label}</strong>
                      <small>
                        {skill.details
                          ? `${skill.details.length} skills & tools · `
                          : ''}
                        {connected.length}{' '}
                        {connected.length === 1 ? 'role' : 'roles'}
                      </small>
                    </span>
                    <ChevronDown size={18} />
                  </button>
                  <div className="mobile-employers" aria-label="Used at">
                    {organizations.map((org) => {
                      const index = chapters.findIndex((c) =>
                        entries.some(
                          (e) =>
                            c.evidenceIds.includes(e.id) &&
                            e.organization === org,
                        ),
                      );
                      return (
                        <span
                          key={org}
                          className={`chapter-color-${Math.max(0, index) % 5}`}
                        >
                          {org}
                        </span>
                      );
                    })}
                  </div>
                  <div id={`mobile-skill-${index}`} hidden={!isOpen}>
                    {isOpen && connectionsPanel()}
                  </div>
                </article>
              );
            })}
          </div>
          {!!filtered.length && (
            <section
              className="skill-map-scroll"
              ref={tableScrollRef}
              data-featured={limited}
              // Keyboard users must be able to scroll the wide table.
              // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              tabIndex={0}
              aria-label="Skill connections by career chapter"
            >
              <table className="skill-map">
                <caption className="sr-only">
                  Skills and the chapters where they were used. Select a skill
                  for its roles, or a connection to inspect the work.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Skill / tool</th>
                    {columns.map(({ chapter, index, organization }) => (
                      <th
                        key={chapter.id}
                        scope="col"
                        className={`chapter-color-${index % 5}`}
                      >
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        {organization}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((skill) => (
                    <tr
                      key={skill.label}
                      data-featured-row={isFeatured(skill.label)}
                      data-selected={active?.label === skill.label}
                    >
                      <th scope="row">
                        <button
                          onClick={() => selectSkill(skill.label)}
                          aria-pressed={active?.label === skill.label}
                        >
                          <span>
                            {skill.label}
                            {skill.details && (
                              <small className="group-count">
                                {skill.details.length} skills & tools
                              </small>
                            )}
                          </span>
                          <ArrowUpRight size={14} />
                        </button>
                      </th>
                      {columns.map(({ chapter, index }) => {
                        const matches = rowConnection(skill).entries.filter(
                          (e) => chapter.evidenceIds.includes(e.id),
                        );
                        return (
                          <td
                            key={chapter.id}
                            className={`chapter-color-${index % 5}`}
                          >
                            {matches.length ? (
                              <button
                                className="skill-link"
                                onClick={() => {
                                  selectSkill(
                                    rowConnection(skill).label,
                                    skill.label,
                                  );
                                }}
                                aria-label={`${rowConnection(skill).label} at ${columns[index].organization}: show connected roles`}
                              >
                                <span aria-hidden="true" />
                                <span className="sr-only">
                                  {matches.length}{' '}
                                  {matches.length === 1
                                    ? 'connection'
                                    : 'connections'}
                                </span>
                              </button>
                            ) : (
                              <span
                                className="skill-absent"
                                aria-label="No listed connection"
                              >
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          {!filtered.length && (
            <div className="explorer-empty">
              <h3>No matching experience</h3>
              <p>Try another skill, role or discipline.</p>
              <button className="action" onClick={clear}>
                Clear filters
              </button>
            </div>
          )}
          {!expanded &&
            !query &&
            !category &&
            filtered.length > shown.length && (
              <button className="map-expand" onClick={() => setExpanded(true)}>
                Show all {filtered.length}{' '}
                {filtered.length === 1 ? 'skill or tool' : 'skills & tools'}{' '}
                <span>+</span>
              </button>
            )}
          {expanded && !query && !category && sort === 'featured' && (
            <button className="map-expand" onClick={() => setExpanded(false)}>
              Back to featured <span>−</span>
            </button>
          )}
        </TabsContent>
        <TabsContent value="roles">
          <div className="role-directory">
            {roles
              .filter((role) => {
                const ids = new Set([
                  role.id,
                  ...entries
                    .filter((e) => e.parentId === role.id)
                    .map((e) => e.id),
                ]);
                return (
                  filtered.some((s) =>
                    rowConnection(s).entries.some((e) => ids.has(e.id)),
                  ) ||
                  (!query && !category)
                );
              })
              .map((role) => (
                <article
                  key={role.id}
                  className={`directory-card chapter-color-${
                    Math.max(
                      0,
                      chapters.findIndex((c) =>
                        c.evidenceIds.includes(role.id),
                      ),
                    ) % 5
                  }`}
                >
                  <p className="eyebrow">{role.organization}</p>
                  <button
                    className="directory-title"
                    onClick={() => onSelect(role)}
                  >
                    <h3>{role.title}</h3>
                    <ArrowUpRight size={20} />
                  </button>
                  <p className="directory-date">{role.date}</p>
                  <div className="skill-chips">
                    {filtered
                      .filter((s) =>
                        rowConnection(s).entries.some(
                          (e) => e.id === role.id || e.parentId === role.id,
                        ),
                      )
                      .map(({ label: skill }) => (
                        <button
                          key={skill}
                          onClick={() => {
                            onSkill(skill);
                            setView('map');
                          }}
                        >
                          {skill}
                        </button>
                      ))}
                  </div>
                </article>
              ))}
          </div>
          {!filtered.length && (query || category) && (
            <div className="explorer-empty">
              <p>No roles match these filters.</p>
              <button className="action" onClick={clear}>
                Clear filters
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
