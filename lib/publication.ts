import { validateProfile } from './model.ts';
import { readerProfile, type ReaderProfile } from './reader.ts';

export type PublishedPage = {
  profile: ReaderProfile;
  company?: string;
  role?: string;
};
export type Publication = {
  home: PublishedPage;
  applications: Array<{ id: string; page: PublishedPage }>;
};

export function validatePublication(input: unknown): Publication {
  if (!input || typeof input !== 'object')
    throw new Error('Invalid publication.');
  const publication = input as Publication;
  const restore = (page: PublishedPage) => {
    if (!page?.profile || !Array.isArray(page.profile.evidence))
      throw new Error('Invalid publication page.');
    return {
      ...page.profile,
      importedAt: 'publication',
      importStatus: 'complete',
      importNotes: [],
      evidence: page.profile.evidence.map((entry) => ({
        ...entry,
        confirmed: false,
      })),
    };
  };
  if (!Array.isArray(publication.applications))
    throw new Error('Invalid publication applications.');
  return preparePublication(
    restore(publication.home),
    publication.applications.map(({ id, page }) => ({
      id,
      company: page?.company,
      role: page?.role,
      status: 'published',
      snapshot: restore(page),
    })),
  );
}

export function applicationId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(value))
    throw new Error(
      'Application IDs must contain lowercase letters, numbers or hyphens.',
    );
  return value;
}

export function preparePublication(
  profileInput: unknown,
  applicationInput: unknown = [],
): Publication {
  const profile = validateProfile(profileInput);
  if (!Array.isArray(applicationInput))
    throw new Error('Applications must be an array.');
  const ids = new Set<string>();
  const applications = applicationInput.flatMap((application) => {
    if (application.status !== 'published') return [];
    const id = applicationId(application.id);
    if (ids.has(id)) throw new Error('Application IDs must be unique.');
    ids.add(id);
    for (const key of ['company', 'role']) {
      if (
        typeof application[key] !== 'string' ||
        !application[key].trim() ||
        application[key].length > 160
      )
        throw new Error(`Invalid application ${key}.`);
    }
    return [
      {
        id,
        page: {
          company: application.company,
          role: application.role,
          profile: readerProfile(validateProfile(application.snapshot)),
        },
      },
    ];
  });
  return { home: { profile: readerProfile(profile) }, applications };
}

export function pageHtml(template: string, page: PublishedPage | null): string {
  const title = page
    ? `${page.profile.name} — ${page.company ?? 'A career in chapters'}`
    : 'Story unavailable';
  const escape = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  // Escape '<' before placing JSON in a script element, including </script>.
  const data = JSON.stringify(page)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
  return template
    .replace(/<title>.*?<\/title>/s, `<title>${escape(title)}</title>`)
    .replace(
      '<!--career-data-->',
      `<script id="career-data" type="application/json">${data}</script>`,
    );
}
