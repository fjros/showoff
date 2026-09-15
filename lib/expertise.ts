import type { SkillMapSettings } from './skill-map';
import type { ReaderEvidence } from './reader';

export type SkillConnection = {
  label: string;
  categories: string[];
  entries: ReaderEvidence[];
  details?: SkillConnection[];
};
export function skillGroups(entry: ReaderEvidence) {
  return (
    entry.skills ??
    (entry.tags.length
      ? [{ category: 'Other experience', items: entry.tags }]
      : [])
  );
}
// Connections are explicit. A project may contribute to its displayed parent,
// but neither text matching nor an omitted role can create a skill claim.
export function expertiseIndex(
  entries: ReaderEvidence[],
  settings?: SkillMapSettings,
): SkillConnection[] {
  const index = new Map<string, SkillConnection>();
  for (const entry of entries.filter(
    (e) => e.kind !== 'language' && e.kind !== 'education',
  )) {
    for (const group of skillGroups(entry))
      for (const label of group.items) {
        const key = label.trim().toLocaleLowerCase();
        const skill = index.get(key) ?? { label, categories: [], entries: [] };
        if (!skill.categories.includes(group.category))
          skill.categories.push(group.category);
        if (!skill.entries.some((e) => e.id === entry.id))
          skill.entries.push(entry);
        index.set(key, skill);
      }
  }
  const grouped = new Set<string>();
  const groups = (settings?.groups ?? []).flatMap((group) => {
    const details = group.members.flatMap((m) => {
      const skill = index.get(m.toLowerCase());
      return skill ? [skill] : [];
    });
    if (!details.length) return [];
    details.forEach((d) => grouped.add(d.label.toLowerCase()));
    return [
      {
        label: group.label,
        categories: [...new Set(details.flatMap((d) => d.categories))],
        entries: [
          ...new Map(
            details.flatMap((d) => d.entries).map((e) => [e.id, e]),
          ).values(),
        ],
        details,
      },
    ];
  });
  return [
    ...groups,
    ...[...index.values()].filter((s) => !grouped.has(s.label.toLowerCase())),
  ].sort((a, b) => a.label.localeCompare(b.label));
}
export function skillMatches(
  skill: SkillConnection,
  query: string,
  category: string,
) {
  const search = [
    skill.label,
    ...(skill.details?.map((d) => d.label) ?? []),
    ...skill.entries.flatMap((e) => [e.title, e.organization]),
  ]
    .join(' ')
    .toLocaleLowerCase();
  return (
    (!category || skill.categories.includes(category)) &&
    query
      .toLocaleLowerCase()
      .trim()
      .split(/\s+/)
      .every((word) => search.includes(word))
  );
}
export function connectionRoles(
  skill: SkillConnection,
  entries: ReaderEvidence[],
) {
  const result = new Map<
    string,
    { role: ReaderEvidence; sources: ReaderEvidence[] }
  >();
  for (const source of skill.entries) {
    const role = entries.find((e) => e.id === source.parentId) ?? source;
    const connection = result.get(role.id) ?? { role, sources: [] };
    connection.sources.push(source);
    result.set(role.id, connection);
  }
  return [...result.values()];
}

export function resolveSkill(
  skills: SkillConnection[],
  label: string,
  preferredGroup?: string,
) {
  const contains = (s: SkillConnection) =>
    s.details?.some((d) => d.label.toLowerCase() === label.toLowerCase());
  return (
    skills.find(
      (s) =>
        s.label === preferredGroup &&
        (s.label.toLowerCase() === label.toLowerCase() || contains(s)),
    ) ??
    skills.find((s) => s.label.toLowerCase() === label.toLowerCase()) ??
    skills.find((s) =>
      s.details?.some((d) => d.label.toLowerCase() === label.toLowerCase()),
    )
  );
}
export function orderSkills(
  skills: SkillConnection[],
  entries: ReaderEvidence[],
  featured: string[],
  sort: string,
) {
  const ranking = new Map(featured.map((s, i) => [s.toLowerCase(), i]));
  return [...skills].sort((a, b) => {
    const difference =
      sort === 'roles'
        ? connectionRoles(b, entries).length -
          connectionRoles(a, entries).length
        : sort === 'featured'
          ? (ranking.get(a.label.toLowerCase()) ?? Infinity) -
            (ranking.get(b.label.toLowerCase()) ?? Infinity)
          : 0;
    return difference || a.label.localeCompare(b.label);
  });
}

// Only narrow a group when a query identifies one of its members unambiguously.
export function matchingDetail(skill: SkillConnection, query: string) {
  const key = query.trim().toLowerCase();
  if (!key || key === skill.label.toLowerCase()) return undefined;
  const exact = skill.details?.find((d) => d.label.toLowerCase() === key);
  if (exact) return exact;
  const matches = skill.details?.filter((d) =>
    d.label.toLowerCase().includes(key),
  );
  return matches?.length === 1 ? matches[0] : undefined;
}
