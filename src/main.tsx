import { createRoot } from 'react-dom/client';
import { CareerStory } from '@/components/showoff/workspace';
import type { PublishedPage } from '@/lib/publication';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@/app/globals.css';

const content = document.getElementById('career-data')?.textContent;
const page: PublishedPage | null = content ? JSON.parse(content) : null;
createRoot(document.getElementById('root')!).render(
  page ? (
    <CareerStory
      profile={page.profile}
      company={page.company}
      role={page.role}
    />
  ) : (
    <main className="empty-view">
      <p className="eyebrow">A career in chapters</p>
      <h1>This story isn’t available.</h1>
      <p>The page may have moved or hasn’t been published yet.</p>
      <a className="action" href={import.meta.env.BASE_URL}>
        Back to the career story
      </a>
    </main>
  ),
);
