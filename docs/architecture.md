# Architecture

## Static publication

The master profile and application snapshots live in JSON files outside Git. `lib/model.ts` validates that content. `lib/reader.ts` makes an explicit visitor-facing projection, excluding provenance and review state. `lib/publication.ts` selects published snapshots and safely serializes their content into HTML.

The Vite content plugin generates a home page, a separate HTML file for every published application, and a content-free 404 page. Each page includes its own JSON script element and shares hashed JavaScript, CSS and font assets. Content is never compiled into the shared JavaScript, so an application page does not deliver unrelated master-profile content. JSON embedded in HTML escapes script-breaking characters.

`src/main.tsx` reads the current page's content and renders `CareerStory`. There are no API calls, backend services, authentication headers or browser-side secrets. React handles the interactive presentation; the server only serves files. Real application directories make deep links and refreshes work on GitHub Pages.

## Source and publishing boundary

The external JSON is authoritative. Ignored `.env.local` holds its paths. Files must resolve outside the checkout, including through symlinks. The local preview reads those files on page requests and reloads when they change.

For deployment, `pages:publish` checks that source is committed and matches GitHub's main branch. It creates a compressed visitor projection and updates a repository secret using GitHub CLI. The manually triggered Pages workflow receives that secret only during the build, uploads the generated files as an artifact and deploys them. No content branch or generated files are pushed. Pull requests and normal source checks have no access to the CV secret.

A missing secret blocks publication. Draft applications are omitted before transport. Each application ID is restricted to a safe lowercase URL segment. Public content is intentionally accessible to everyone; the repository secret protects source handling, not the published CV.

## Career presentation

The product has three levels: an animated chapter atlas for an overview, role entries within a chronological story, and a searchable skills explorer for detailed connections. Research projects remain nested under the experience that contains them. Education opens as a complete timeline. Optional links point to the actual work without automatic source links.

Editorial chapters, career transitions, qualifications and accomplishments come from the profile rather than inference. Chapter periods may overlap. Older snapshots without chapters group only their own entries by organization.

## Skills and featured selections

`Evidence.skills` contains categories and labels. The index merges labels case-insensitively and retains the originating role or project. It never infers skills from prose. Project claims attach to a parent only when it exists in the current snapshot.

`Profile.skillMap.featured` defines the ordered default rows. `groups` defines `{ label, members }` collections. A tool can belong to multiple groups without changing its actual role assignments. Searching a tool narrows the connections to its explicit experience. Group navigation preserves the selected tool where appropriate.

The featured table shows all rows. On desktop and tablet, the full list is capped at the measured height of the featured rows, updated as the screen resizes. Phones use expandable skill cards with an optional horizontally scrolling comparison table.

Chapters can define up to six `featuredSkills`, referencing their own evidence. These only control preview chips, never remove skills from the explorer. Application snapshots scope the skill map and retain chapter prose only for fully selected chapters.

## Motion and accessibility

The atlas supports chapter selection and a local motion toggle. System reduced-motion preferences take precedence. Keyboard focus, labelled connections and dialog semantics are retained. Detail panels keep their close button above the scrollable body, and mobile controls use generous touch targets.
