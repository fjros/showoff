// Presentation settings belong to the private profile, never to a bundled CV.
export type SkillMapSettings = {
  featured: string[];
  groups: { label: string; members: string[] }[];
};
type SkillRecord = {
  kind: string;
  tags: string[];
  skills?: { items: string[] }[];
};
export function skillLabels(entries: SkillRecord[]) {
  return new Set(
    entries
      .filter((e) => e.kind !== 'language' && e.kind !== 'education')
      .flatMap((e) => (e.skills ? e.skills.flatMap((g) => g.items) : e.tags))
      .map((s) => s.toLowerCase()),
  );
}
export function scopeSkillMap(
  settings: SkillMapSettings,
  entries: SkillRecord[],
): SkillMapSettings {
  const labels = skillLabels(entries);
  const groups = settings.groups
    .map((g) => ({
      ...g,
      members: g.members.filter((m) => labels.has(m.toLowerCase())),
    }))
    .filter((g) => g.members.length);
  const grouped = new Set(
    groups.flatMap((g) => g.members.map((m) => m.toLowerCase())),
  );
  const visible = new Set(
    [...labels]
      .filter((s) => !grouped.has(s))
      .concat(groups.map((g) => g.label.toLowerCase())),
  );
  return {
    groups,
    featured: settings.featured.filter((s) => visible.has(s.toLowerCase())),
  };
}
export function validateSkillMap(
  input: unknown,
  entries: SkillRecord[],
): SkillMapSettings {
  if (!input || typeof input !== 'object')
    throw new Error('Invalid skill map settings.');
  const s = input as SkillMapSettings;
  const text = (v: unknown): string => {
    if (typeof v !== 'string' || !v.trim() || v.length > 80)
      throw new Error('Invalid skill map label.');
    return v.trim();
  };
  const list = (v: unknown, max: number) => {
    if (!Array.isArray(v) || v.length > max)
      throw new Error('Invalid skill map list.');
    const result = v.map(text);
    if (new Set(result.map((x) => x.toLowerCase())).size !== result.length)
      throw new Error('Duplicate skill map label.');
    return result;
  };
  if (!Array.isArray(s.groups) || s.groups.length > 50)
    throw new Error('Invalid skill map groups.');
  const labels = skillLabels(entries),
    used = new Set<string>(),
    groupNames = new Set<string>();
  const groups = s.groups.map((g) => {
    const label = text(g?.label),
      key = label.toLowerCase();
    if (groupNames.has(key)) throw new Error('Duplicate skill map group.');
    groupNames.add(key);
    const members = list(g?.members, 80);
    if (!members.length)
      throw new Error('Skill map groups must contain skills.');
    for (const member of members) {
      const m = member.toLowerCase();
      if (!labels.has(m))
        throw new Error('Skill map members must reference listed skills.');
      used.add(m);
    }
    if (labels.has(key) && !members.some((m) => m.toLowerCase() === key))
      throw new Error(
        'Include the existing skill when reusing its label for a group.',
      );
    return { label, members };
  });
  const visible = new Set(
    [...labels].filter((s) => !used.has(s)).concat([...groupNames]),
  );
  const featured = list(s.featured, 30);
  if (featured.some((s) => !visible.has(s.toLowerCase())))
    throw new Error('Featured skills must reference visible skills or groups.');
  return { featured, groups };
}
