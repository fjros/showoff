# Showoff

A CV told as an interactive career story: an animated chapter atlas, expandable roles and projects, a complete education timeline, and a skills map connecting tools to the work where they were used. The layout adapts to phones, tablets and desktops and respects reduced-motion preferences.

Built with React, TypeScript and Vite. The published site is static HTML, CSS, JavaScript and fonts. It needs no server, database or visitor account.

## Run locally

Use Node.js 22.13 or later.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

In `.env.local`, set `SHOWOFF_PROFILE_PATH` to an absolute path to your private profile JSON **outside this repository**. Optionally set `SHOWOFF_APPLICATIONS_PATH` to an external JSON file containing an array of application snapshots (initially `[]`). These files are the source of truth. Changes reload the local preview.

Without a profile, the app builds an empty unavailable page so contributors and CI can check the source without anyone's CV. There is no sample biography.

## Keep content outside Git

Never commit CV JSON, application briefs, snapshots, database backups, credentials or screenshots containing personal content. The build validates external paths, including symlink targets, and strips import notes, confirmation flags and legacy source URLs. Deliberately attached work links remain visible.

Generated `dist/` files contain the intended public content and are ignored by Git. Public pages can be read by anyone, even when their content came from a private file or a GitHub secret. Unique application URLs identify versions; they do not restrict access.

## Publish to GitHub Pages

Create a public repository, push the source to its `main` branch, and select **GitHub Actions** as the Pages publishing source in the repository settings. No custom domain is required.

With GitHub CLI authenticated and the local source committed and pushed:

```sh
npm run pages:publish -- OWNER/REPOSITORY
```

This command reads the external files, prepares only the visitor-facing content, compresses it, and sends it to the `SHOWOFF_PUBLICATION` repository secret over stdin. It then starts the Pages workflow. It never adds content to Git or prints the payload. GitHub's 48KB secret limit is checked before uploading; a larger publication needs a different content transport.

The workflow builds and deploys a Pages artifact. The default URL is `https://OWNER.github.io/REPOSITORY/`; a repository named `OWNER.github.io` uses the account root. Assets and application URLs work under either base path. GitHub hosts the deployed result independently of the local preview.

Publication is explicit: ordinary pushes and pull requests run source checks without CV data. Publish again after changing the CV, application snapshots or app code. The workflow fails rather than deploying an empty page if the publication secret is missing.

To rebuild the previously approved content without changing it:

```sh
gh workflow run pages.yml --repo OWNER/REPOSITORY --ref main
```

## Tailored applications

Each published snapshot generates `/a/ID/index.html`, so direct links and refreshes work on Pages without a routing fallback. The application page contains only its own snapshot; it never fetches the master CV. Draft snapshots generate no page. Unknown URLs show a dedicated 404 page.

Prepare a brief JSON file outside Git with `company`, `role`, `headline`, `introduction` and `evidenceIds`. Use the exact evidence IDs in the private profile. Then run:

```sh
npm run application:create -- /private/profile.json /private/brief.json /private/applications.json company-role
```

This appends a draft snapshot, refuses duplicate IDs and leaves existing snapshots intact. Add `--publish` to include a new snapshot in the next deployment. Review drafts in the external file and change their `status` to `published` when ready, then publish. Deleting an application from the external array removes its page on the next deployment.

Chapter prose is retained only when all its referenced entries are selected, preventing a tailored page from mentioning omitted experience. Skills and group memberships are scoped to the selected evidence.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
node scripts/check-privacy.mjs /private/profile.json
```

To test a project URL locally, build with `SHOWOFF_BASE_PATH=/repository-name/` and visit that path on the preview server.

See [the architecture](docs/architecture.md) for the data and presentation model.
