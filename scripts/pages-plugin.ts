import type { Plugin } from 'vite';
import { pageHtml, type Publication } from '../lib/publication.ts';
import { loadPublication, type ContentSettings } from './private-content.ts';

export function pagesContent(settings: ContentSettings): Plugin {
  let publication: Publication | null = null;
  let base = '/';
  return {
    name: 'career-pages',
    enforce: 'post',
    configResolved(config) {
      base = config.base;
    },
    async buildStart() {
      publication = await loadPublication(settings);
    },
    configureServer(server) {
      // Private files are watched explicitly, never served as public assets.
      for (const path of [
        settings.SHOWOFF_PROFILE_PATH,
        settings.SHOWOFF_APPLICATIONS_PATH,
      ]) {
        if (path) server.watcher.add(path);
      }
      server.watcher.on('change', (path) => {
        if (
          [
            settings.SHOWOFF_PROFILE_PATH,
            settings.SHOWOFF_APPLICATIONS_PATH,
          ].includes(path)
        )
          server.ws.send({ type: 'full-reload' });
      });
    },
    transformIndexHtml: {
      order: 'post',
      async handler(html, context) {
        if (!context.server) return html;
        const current = await loadPublication(settings);
        const path = (context.originalUrl ?? context.path)
          .split('?')[0]
          .slice(base.length)
          .replace(/\/$/, '');
        const page =
          path === '' || path === 'index.html'
            ? current?.home
            : current?.applications.find((a) => path === `a/${a.id}`)?.page;
        return pageHtml(html, page ?? null);
      },
    },
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset')
        throw new Error('Missing HTML entry point.');
      const template = String(index.source);
      index.source = pageHtml(template, publication?.home ?? null);
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: pageHtml(template, null),
      });
      this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });
      for (const application of publication?.applications ?? []) {
        this.emitFile({
          type: 'asset',
          fileName: `a/${application.id}/index.html`,
          source: pageHtml(template, application.page),
        });
      }
    },
  };
}
