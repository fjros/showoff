import { scopeSkillMap, type SkillMapSettings } from './skill-map.ts';
import type { Chapter, Evidence, Profile } from './model.ts';

export type ReaderEvidence = Pick<
  Evidence,
  | 'id'
  | 'kind'
  | 'title'
  | 'organization'
  | 'date'
  | 'summary'
  | 'tags'
  | 'skills'
  | 'links'
  | 'parentId'
>;
export type ReaderProfile = Pick<
  Profile,
  'name' | 'location' | 'headline' | 'introduction'
> & {
  evidence: ReaderEvidence[];
  chapters: Chapter[];
  skillMap?: SkillMapSettings;
};

// Explicit allowlist: provenance, review state and legacy profile URLs never
// enter published pages. Only deliberately attached work links do.
export function readerProfile(profile: Profile): ReaderProfile {
  return {
    name: profile.name,
    location: profile.location,
    headline: profile.headline,
    introduction: profile.introduction,
    evidence: profile.evidence.map((e) => ({
      id: e.id,
      kind: e.kind,
      title: e.title,
      organization: e.organization,
      date: e.date,
      summary: e.summary,
      tags: e.tags,
      ...(e.skills ? { skills: e.skills } : {}),
      links: e.links ?? [],
      ...(e.parentId ? { parentId: e.parentId } : {}),
    })),
    chapters: profile.chapters ?? [],
    ...(profile.skillMap
      ? { skillMap: scopeSkillMap(profile.skillMap, profile.evidence) }
      : {}),
  };
}

export function groupEntries(entries: ReaderEvidence[]) {
  const ids = new Set(entries.map((e) => e.id));
  return entries
    .filter((e) => !e.parentId || !ids.has(e.parentId))
    .map((entry) => ({
      entry,
      projects: entries.filter((e) => e.parentId === entry.id),
    }));
}
