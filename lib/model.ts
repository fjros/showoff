import {
  scopeSkillMap,
  skillLabels,
  validateSkillMap,
  type SkillMapSettings,
} from './skill-map.ts';
export type EvidenceKind = 'experience' | 'research' | 'education' | 'language';
export type SkillGroup = { category: string; items: string[] };
export type WorkLink = { label: string; url: string };
export type ProjectShowcase = {
  placement?: 'before-story' | 'after-story' | 'after-skills';
  eyebrow: string;
  title: string;
  summary: string;
  technologies: string[];
  demoUrl: string;
  repositoryUrl: string;
  engineeringUrl: string;
  video: {
    url: string;
    posterUrl: string;
    captionsUrl: string;
    transcriptUrl: string;
    label: string;
  };
  scenarios: { title: string; description: string; url: string }[];
};
export type Chapter = {
  id: string;
  title: string;
  period: string;
  summary: string;
  highlights: string[];
  featuredSkills?: string[];
  evidenceIds: string[];
};
export type Evidence = {
  id: string;
  kind: EvidenceKind;
  title: string;
  organization: string;
  date: string | null;
  summary: string;
  tags: string[];
  skills?: SkillGroup[];
  sourceUrl?: string;
  links?: WorkLink[];
  parentId?: string;
  sourceNote: string;
  confirmed: boolean;
};
export type Profile = {
  name: string;
  location: string;
  headline: string;
  introduction: string;
  sourceUrl?: string;
  importedAt: string;
  importStatus: 'partial' | 'complete';
  importNotes: string[];
  evidence: Evidence[];
  chapters?: Chapter[];
  skillMap?: SkillMapSettings;
  showcase?: ProjectShowcase;
};
export type ProfileRecord = { profile: Profile; revision: number };
export type Application = {
  id: string;
  company: string;
  role: string;
  status: 'draft' | 'published';
  snapshot: Profile;
  profileRevision: number;
  createdAt: string;
};
function string(value: unknown, key: string, max = 4000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(`Invalid ${key}.`);
  return value.trim();
}
export function safeUrl(value: unknown): string {
  const url = new URL(string(value, 'source URL', 2000));
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('Use an HTTPS source URL.');
  return url.toString();
}
export function validateProfile(input: unknown): Profile {
  if (!input || typeof input !== 'object')
    throw new Error('A profile object is required.');
  const p = input as Record<string, unknown>;
  if (!Array.isArray(p.evidence) || p.evidence.length > 100)
    throw new Error('A maximum of 100 evidence records is supported.');
  const ids = new Set<string>();
  const evidence = p.evidence.map((item: unknown): Evidence => {
    if (!item || typeof item !== 'object') throw new Error('Invalid evidence.');
    const e = item as Record<string, unknown>;
    const id = string(e.id, 'evidence ID', 100);
    if (ids.has(id)) throw new Error('Evidence IDs must be unique.');
    ids.add(id);
    if (
      !['experience', 'research', 'education', 'language'].includes(
        String(e.kind),
      )
    )
      throw new Error('Invalid evidence kind.');
    if (!Array.isArray(e.tags) || e.tags.length > 12)
      throw new Error('Invalid tags.');
    if (typeof e.confirmed !== 'boolean')
      throw new Error('Evidence review status is required.');
    return {
      id,
      kind: e.kind as EvidenceKind,
      title: string(e.title, 'title', 500),
      organization: string(e.organization, 'organization', 300),
      date: e.date === null ? null : string(e.date, 'date', 100),
      summary: string(e.summary, 'summary'),
      tags: e.tags.map((t) => string(t, 'tag', 80)),
      ...(e.sourceUrl ? { sourceUrl: safeUrl(e.sourceUrl) } : {}),
      ...(e.skills !== undefined ? { skills: validateSkills(e.skills) } : {}),
      ...(e.links !== undefined ? { links: validateLinks(e.links) } : {}),
      ...(e.parentId !== undefined
        ? { parentId: string(e.parentId, 'parent role', 100) }
        : {}),
      sourceNote: e.sourceNote ? string(e.sourceNote, 'source note') : '',
      confirmed: e.confirmed,
    };
  });
  for (const entry of evidence) {
    if (!entry.parentId) continue;
    const parent = evidence.find((e) => e.id === entry.parentId);
    if (entry.kind !== 'research' || parent?.kind !== 'experience')
      throw new Error(
        'A research project must belong to an existing experience role.',
      );
  }
  if (!['partial', 'complete'].includes(String(p.importStatus)))
    throw new Error('Invalid import status.');
  if (!Array.isArray(p.importNotes) || p.importNotes.length > 20)
    throw new Error('Invalid import notes.');
  return {
    name: string(p.name, 'name', 200),
    location: string(p.location, 'location', 200),
    headline: string(p.headline, 'headline', 240),
    introduction: string(p.introduction, 'introduction', 2000),
    ...(p.sourceUrl ? { sourceUrl: safeUrl(p.sourceUrl) } : {}),
    importedAt: string(p.importedAt, 'import date', 100),
    importStatus: p.importStatus as Profile['importStatus'],
    importNotes: p.importNotes.map((n) => string(n, 'import note')),
    evidence,
    ...(p.showcase !== undefined
      ? { showcase: validateShowcase(p.showcase) }
      : {}),
    ...(p.skillMap !== undefined
      ? { skillMap: validateSkillMap(p.skillMap, evidence) }
      : {}),
    ...(p.chapters !== undefined
      ? { chapters: validateChapters(p.chapters, evidence) }
      : {}),
  };
}
export function validateShowcase(input: unknown): ProjectShowcase {
  if (!input || typeof input !== 'object')
    throw new Error('Invalid project showcase.');
  const s = input as ProjectShowcase;
  if (
    s.placement !== undefined &&
    s.placement !== 'before-story' &&
    s.placement !== 'after-story' &&
    s.placement !== 'after-skills'
  )
    throw new Error('Invalid project showcase placement.');
  if (
    !Array.isArray(s.technologies) ||
    s.technologies.length > 8 ||
    !Array.isArray(s.scenarios) ||
    !s.scenarios.length ||
    s.scenarios.length > 5 ||
    !s.video ||
    typeof s.video !== 'object'
  )
    throw new Error('Invalid project showcase.');
  return {
    ...(s.placement !== undefined ? { placement: s.placement } : {}),
    eyebrow: string(s.eyebrow, 'showcase eyebrow', 100),
    title: string(s.title, 'showcase title', 150),
    summary: string(s.summary, 'showcase summary', 700),
    technologies: s.technologies.map((t) => string(t, 'technology', 50)),
    demoUrl: safeUrl(s.demoUrl),
    repositoryUrl: safeUrl(s.repositoryUrl),
    engineeringUrl: safeUrl(s.engineeringUrl),
    video: {
      url: safeUrl(s.video.url),
      posterUrl: safeUrl(s.video.posterUrl),
      captionsUrl: safeUrl(s.video.captionsUrl),
      transcriptUrl: safeUrl(s.video.transcriptUrl),
      label: string(s.video.label, 'video label', 150),
    },
    scenarios: s.scenarios.map((sc) => ({
      title: string(sc?.title, 'scenario title', 150),
      description: string(sc?.description, 'scenario description', 250),
      url: safeUrl(sc?.url),
    })),
  };
}
function validateSkills(input: unknown): SkillGroup[] {
  if (!Array.isArray(input) || input.length > 12)
    throw new Error('Invalid skill groups.');
  const categories = new Set<string>();
  return input.map((group) => {
    const category = string(group?.category, 'skill category', 80);
    if (categories.has(category.toLowerCase()))
      throw new Error('Duplicate skill category.');
    categories.add(category.toLowerCase());
    if (
      !Array.isArray(group.items) ||
      !group.items.length ||
      group.items.length > 40
    )
      throw new Error('Invalid skills.');
    const items = group.items.map((item: unknown) => string(item, 'skill', 80));
    if (
      new Set(items.map((item: string) => item.toLowerCase())).size !==
      items.length
    )
      throw new Error('Duplicate skills.');
    return { category, items };
  });
}
function validateLinks(input: unknown): WorkLink[] {
  if (!Array.isArray(input) || input.length > 10)
    throw new Error('Invalid links.');
  return input.map((link) => ({
    label: string(link?.label, 'link label', 120),
    url: safeUrl(link?.url),
  }));
}
function validateChapters(input: unknown, evidence: Evidence[]): Chapter[] {
  const evidenceIds = new Set(evidence.map((e) => e.id));
  if (!Array.isArray(input) || input.length > 20)
    throw new Error('Invalid chapters.');
  const ids = new Set<string>();
  return input.map((chapter) => {
    const id = string(chapter?.id, 'chapter ID', 100);
    if (ids.has(id)) throw new Error('Chapter IDs must be unique.');
    ids.add(id);
    if (
      !Array.isArray(chapter.evidenceIds) ||
      !chapter.evidenceIds.length ||
      new Set(chapter.evidenceIds).size !== chapter.evidenceIds.length ||
      chapter.evidenceIds.some(
        (id: unknown) => typeof id !== 'string' || !evidenceIds.has(id),
      )
    )
      throw new Error('Chapters must reference existing evidence.');
    if (!Array.isArray(chapter.highlights) || chapter.highlights.length > 5)
      throw new Error('Invalid chapter highlights.');
    let featuredSkills: string[] | undefined;
    if (chapter.featuredSkills !== undefined) {
      if (
        !Array.isArray(chapter.featuredSkills) ||
        chapter.featuredSkills.length > 6
      )
        throw new Error('Invalid chapter featured skills.');
      featuredSkills = chapter.featuredSkills.map((s: unknown) =>
        string(s, 'featured skill', 80),
      );
      const labels = skillLabels(
        evidence.filter((e) => chapter.evidenceIds.includes(e.id)),
      );
      if (
        new Set(featuredSkills!.map((s) => s.toLowerCase())).size !==
          featuredSkills!.length ||
        featuredSkills!.some((s) => !labels.has(s.toLowerCase()))
      )
        throw new Error(
          'Chapter featured skills must reference distinct skills in that chapter.',
        );
    }
    return {
      id,
      ...(featuredSkills !== undefined ? { featuredSkills } : {}),
      title: string(chapter.title, 'chapter title', 200),
      period: string(chapter.period, 'chapter period', 100),
      summary: string(chapter.summary, 'chapter summary', 2000),
      highlights: chapter.highlights.map((h: unknown) =>
        string(h, 'highlight', 200),
      ),
      evidenceIds: chapter.evidenceIds,
    };
  });
}
export function createSnapshot(profile: Profile, input: unknown) {
  if (!input || typeof input !== 'object')
    throw new Error('An application brief is required.');
  const body = input as Record<string, unknown>;
  const company = string(body.company, 'company', 120);
  const role = string(body.role, 'role', 160);
  if (!Array.isArray(body.evidenceIds) || body.evidenceIds.length === 0)
    throw new Error('Select at least one piece of evidence.');
  const ids = body.evidenceIds;
  if (
    new Set(ids).size !== ids.length ||
    ids.some(
      (id) =>
        typeof id !== 'string' || !profile.evidence.some((e) => e.id === id),
    )
  )
    throw new Error('Select existing evidence only.');
  const evidence = ids.map((id) => profile.evidence.find((e) => e.id === id)!);
  const headline = string(body.headline, 'headline', 240);
  const introduction = string(body.introduction, 'introduction', 2000);
  const snapshot = {
    ...profile,
    headline,
    introduction,
    importNotes: [],
    ...(profile.skillMap
      ? { skillMap: scopeSkillMap(profile.skillMap, evidence) }
      : {}),
    evidence: evidence.map(({ parentId, ...e }) => ({
      ...e,
      sourceNote: '',
      ...(parentId && ids.includes(parentId) ? { parentId } : {}),
    })),
    // Chapter prose may describe every item in that chapter. Carry it only when
    // the entire chapter was selected, so omitted accomplishments cannot leak.
    ...(profile.chapters
      ? {
          chapters: profile.chapters.filter((chapter) =>
            chapter.evidenceIds.every((id) => ids.includes(id)),
          ),
        }
      : {}),
  };
  return { company, role, snapshot: structuredClone(snapshot) };
}
