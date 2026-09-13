# Personal website

React, Vite, and TypeScript website at [joshuareisbord.com/](https://joshuareisbord.com/), hosted on Firebase project `personal-website-f17c6`. Approved owners sign in with Google and edit public content through a Firestore-backed CMS. Pages are prerendered for the initial response and hydrated in the browser; no custom application server is deployed.

**Live CMS configured on September 9, 2026.** Google sign-in is enabled, `joshuareisbord.com` is authorized, the tested Firestore rules are deployed, and `joshuareisbord@gmail.com` is enabled as the first owner. Hosting builds use the verified public Firebase configuration from GitHub Actions variables. The first owner sign-in and content save on the live site remain to be verified by the owner; no production content has been seeded automatically.

## Design

The visual references are [Anduril](https://www.anduril.com/) and [Inversion](https://www.inversionspace.com/). The site uses a light paper background, black display typography, fine rules, and an original technical vector graphic. The graphic starts smoothly from its server-rendered pose and rotates slowly at rest. Scrolling down accelerates it forward; scrolling up reverses it, with momentum easing back to the idle speed. Motion pauses offscreen, in hidden tabs, and for reduced-motion preferences without resetting its position. Barlow and IBM Plex Mono are bundled locally. About and work experience remain the focus; one optional profile photo appears in About, and LinkedIn/GitHub links appear below Find me online in the contact section. Project cards and project CTAs are removed.

Updated career wording and a profile photo still await owner input. The repository seed currently has `photo: null` and an empty experience list; it does not invent a portrait or new work history. These can be supplied through the owner CMS, with the seed/SEO update distinction described below.

Contact social links and decorative link arrows use SVG paths imported from Material Design Icons (`@mdi/js`), with accessible link names and large touch targets. SVG arrows remain monochrome on mobile rather than depending on emoji fonts. The unused PNG logos have been removed. Only the imported paths are bundled; no icon font or external icon request is needed.

## Working on the code

See [Code structure and maintenance](docs/architecture.md) for the entry points, feature modules, content flow, and behavior to preserve. Application components, hooks, data models, build scripts, tests, and Vite configuration use TypeScript. Strict checking includes unchecked array access and exact optional properties; public data is validated at runtime with Zod before it reaches the UI.

Run `npm run format` after editing. Prettier expands JSX and compound expressions consistently, and `.editorconfig` supplies matching editor defaults. `npm run verify` checks formatting as well as types, tests, and the production build, so pull requests cannot silently return to compressed code.

## Local development

Use Node 26.8.1 or a newer Node 26 release, npm, and Java 21 for Firestore and Storage emulator tests. The development container includes Node and Java and forwards Vite development (5173), Vite preview (4173), Hosting (5002), Auth (9099), Firestore (8080), and Storage (9199). GitHub Actions reads the runtime from `.nvmrc`.

On macOS with Homebrew's `openjdk@21` installed, select it for the current shell without a global Java symlink:

```sh
export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
```

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open [localhost:5173/](http://localhost:5173/). Without Firebase configuration the site shows its committed seed and disables editing.

| Command | Purpose |
| --- | --- |
| `npm run check` | TypeScript validation |
| `npm run format` | Format TypeScript, TSX, CSS, scripts, and tests |
| `npm run format:check` | Check formatting without changing files |
| `npm test` | Unit and render tests |
| `npm run test:rules` | Firestore and Storage rules tests in the isolated `demo-personal-website` emulator project |
| `npm run build` | Vite browser/SSR builds, static prerendering, and output verification |
| `npm run verify` | Formatting, TypeScript, unit/render tests, and build |
| `npm run preview` | Preview built assets on port 4173 |
| `npm run hosting:preview` | Preview built assets with Firebase routing on port 5002 |
| `npm run cms:emulators` | Start local demo Auth (9099), Firestore (8080), and Storage (9199) |
| `npm run cms:seed` | Enable the first owner in the local demo Firestore only |
| `npm run geography:prepare` | Rebuild the committed geographic outlines and city lookup assets; see `docs/geography.md` for sources and licenses |
| `npm run deploy:rules` | Separate, manual Firestore rules deployment after the review below |
| `npm run deploy:storage-rules` | Separate, manual Storage rules deployment after reviewing the bucket rules and permissions |

`npm run build` uses `src/entry-server.tsx` and the ignored `.prerender/` directory only during the build. Hosting serves `dist/index.html`, `dist/404.html`, and public assets. Build before running either preview command. Vite preview does not implement Firebase redirects; use [localhost:5002/](http://localhost:5002/) to check Hosting. Port 5002 avoids macOS AirPlay's port 5000 conflict.

Copy `.env.example` to ignored `.env.local` and set the five Firebase web-app values for the project you intend to use:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`

These values are public client configuration compiled into browser assets, not administrator credentials. Authorization comes from Firebase Auth, Firestore rules, and Storage rules. Never put service-account private keys in `VITE_*` variables. See [Firebase API-key guidance](https://firebase.google.com/docs/projects/api-keys).

For isolated CMS testing, put these exact demo values in ignored `.env.local`:

```dotenv
VITE_FIREBASE_API_KEY=demo-key
VITE_FIREBASE_AUTH_DOMAIN=demo-personal-website.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-personal-website
VITE_FIREBASE_APP_ID=demo-app
VITE_FIREBASE_STORAGE_BUCKET=demo-personal-website.appspot.com
VITE_USE_FIREBASE_EMULATORS=true
```

Start Auth, Firestore, and Storage in one terminal and leave them running:

```sh
npm run cms:emulators
```

In another terminal, bootstrap the demo owner and start or restart Vite:

```sh
npm run cms:seed
npm run dev
```

The seed helper is hardcoded to `127.0.0.1:8080` and project `demo-personal-website`. It enables only `websiteOwners/joshuareisbord@gmail.com`; it does not publish content or create an Auth account. Open the local site and use the Google sign-in emulator popup with `joshuareisbord@gmail.com`, then edit and save to test publishing. The committed content remains visible until the first successful save.

Enabling the emulator switch away from localhost/loopback is rejected: CMS initialization fails closed rather than connecting to a live backend. Keep it false in hosted builds. Emulator data and owner records are separate from production. The rules test command provisions its own test identities and data; run it separately from interactive emulator sessions because both use Firestore port 8080.

## Configure the live CMS and first owner

1. In the Firebase console, select `personal-website-f17c6`, register or identify its web app, and copy its actual API key, auth domain, project ID, app ID, and Storage bucket. Do not infer missing values from the domain.
2. Enable **Authentication → Sign-in method → Google** and choose the required support email. Under Authentication's authorized domains, include `joshuareisbord.com` and each hostname actually used for owner sign-in. Add `localhost` only when deliberately testing live Auth locally. The app uses Google's `signInWithPopup` flow; no hosted custom OAuth callback is needed. See [Firebase Google sign-in setup](https://firebase.google.com/docs/auth/web/google-signin).
3. Use the project's default Firestore database. Before deploying rules, inventory the existing rules and consumers, back them up, and merge the website rules with any rules needed by other applications. **Do not blindly replace existing Firestore rules**: a rules deployment applies to the database, not just these two collections. Run `npm run test:rules`, authenticate the Firebase CLI as an authorized project administrator, confirm the target project, then separately run `npm run deploy:rules`.
4. Bootstrap the first owner through the **Firestore console**, using collection `websiteOwners`, document ID **`joshuareisbord@gmail.com`**, and field **`enabled` of type boolean set to `true`**. The document path is `websiteOwners/joshuareisbord@gmail.com`. There is no browser self-registration or client bootstrap.
5. Set the five public `VITE_FIREBASE_*` values under repository **Settings → Secrets and variables → Actions → Variables**. Deploy Hosting to bake them into the browser build. Keep `FIREBASE_SERVICE_ACCOUNT_PERSONAL_WEBSITE_F17C6` as an Actions **secret**.
6. Open the site, sign in with the Google account `joshuareisbord@gmail.com`, edit the content, and explicitly save. Verify the saved content in a signed-out browser.

Owners can add or remove other approved email addresses in the CMS. Addresses are normalized to lowercase and stored as `websiteOwners/{lowercaseemail}` with `{ enabled: true }`. Owners cannot remove themselves. Signing in with an unapproved Google account does not grant editing access; project administrators can repair the allowlist through the console if necessary.

The September 9 production inventory found only the legacy `projects` collection. Its public reads and writes by the two previously authorized UIDs are preserved under `/projects/{document=**}`; these legacy permissions do not grant access to the CMS or owner allowlist. Legacy Storage permissions and existing data are preserved outside the reserved `website-profile/` upload prefix. The pre-migration Firestore and Storage rulesets, release references, and authorized domains were backed up outside the repository under `~/Documents/Firebase Backups/personal-website-f17c6/2026-09-09/`. These are configuration backups, not a database export. Retire legacy access only after its consumers and data have been reviewed separately.

## Profile photo uploads

In **Owners Login → Profile & bio**, choose **Upload photo**, add a description, and select **Save and publish**. The editor previews your selection before uploading. PNG, JPEG, and WebP files up to 10 MiB and 40 megapixels are accepted; the browser resizes to at most 1200 × 1200, strips source metadata by redrawing, and creates a JPEG no larger than 1 MiB. Transparent areas become white. **Revert upload** keeps the previous link; **Remove photo** hides the image after saving. An HTTPS photo link remains available as an alternative.

The portrait fills the About section's left column on desktop and expands to a comfortable width on mobile. Select **Crop photo** to drag the image or use arrow keys, and adjust **Zoom** to frame a 4:5 portrait. **Apply crop** updates the draft preview; **Cancel crop** leaves the previous framing intact, and **Reset crop** returns to the centered cover view. Finish or cancel cropping before **Save and publish** becomes available. Reopening the cropper restores the saved framing.

Cropping uses npm-managed `react-easy-crop` and stores an optional validated percentage rectangle in `profile.photo.crop`. The shared photo renderer applies this rectangle consistently in the editor and public About section, without altering the source image or making a second upload. This works for uploaded and linked photos without requiring cross-origin canvas access. New uploads or edited photo links clear the old framing; reverting an upload restores the saved photo's crop. Existing snapshots without crop data continue using centered cover framing. Uploaded source images still undergo the resizing and metadata removal described above; crop metadata is presentation, not image redaction. No Firebase rule change or data migration is required.

Uploads use the existing `personal-website-f17c6.appspot.com` Firebase Storage bucket. `VITE_FIREBASE_STORAGE_BUCKET` is public configuration, included in the production Actions variables. The bucket and project ownership were verified, prior rules and IAM policy were backed up outside the repository under `~/Documents/Firebase Backups/personal-website-f17c6/2026-09-09/photo-upload/`, and the scoped upload rules were deployed. Storage's service account needs `roles/firebaserules.firestoreServiceAgent` to check the existing `websiteOwners` allowlist; verify this cross-service permission when setting up another project. No new service-account key is needed. See [cross-service Storage rules](https://firebase.google.com/docs/storage/security/rules-conditions#enhance_with_cloud_firestore).

Each upload receives a unique `website-profile/{ownerUid}/{uuid}.jpg` path. Rules allow creation only for verified, enabled Google owners, in their own UID folder, with JPEG content type and a 1 MiB limit. Photos are public to read, with no public listing. Browser clients cannot overwrite or delete uploads. Legacy authenticated Storage access is retained outside this prefix. Review and back up all bucket rules before a later `npm run deploy:storage-rules`; Hosting workflows do not deploy rules.

The content document changes only after the upload succeeds and the normal revision check passes. Failed uploads preserve the published photo and local draft. If uploading succeeds but publishing fails, retrying the unchanged draft reuses that upload. Discarded drafts can leave unused objects, and old photos remain accessible at their URLs after replacement/removal. An administrator can remove those after checking they are no longer referenced by current content or backups. The site does not automatically delete cloud assets.

Local demo uploads use Storage port 9199. Demo content still stores HTTPS-formatted photo URLs; the explicit localhost emulator mode maps only this demo bucket's upload URLs to the local emulator. Production never uses this mapping. Keep the emulator switch disabled on hosted builds.

## Publishing and stored content

Editing is a local draft until **Save** succeeds. Save publishes browser-visible content through Firestore without a Git commit or Hosting deployment. If authorization, connectivity, validation, or a conflicting revision prevents a save, resolve the reported failure before treating the draft as published.

The owner editor uses the website's paper background, black typography, and ruled sections to group profile, work experience, and contact settings. Email and phone are independently optional: leave either blank to hide that link, or leave both blank to show only the social links below Find me online. Social links remain visible when email or phone is provided. Enter the phone number as you want it displayed; the editor builds its call link automatically. Existing publications retain their contact information until an owner explicitly edits and saves it. Missing optional contact fields normalize to empty strings, while malformed addresses and incomplete phone/link pairs are rejected.

Work dates use a keyboard-accessible month picker and display as **March, 2024**. End dates can be cleared to **Present**. Existing year-only dates retain their precision until a month is explicitly chosen; the editor never assumes January. Dates earlier than a role's start are rejected.

The location picker loads countries, regions, and searchable cities from this site's static assets. Selecting a city saves a `place` object (latitude, longitude, country code, and optional region/city) together with the location label. Existing text-only locations are preserved; choose a city to map them. **Remote** and **Clear location** remove coordinates. City selection needs no API key, external geocoding request, or browser location permission. After choosing a city, optionally search for and select an office address. The public job label stays city, state/province, country; the map uses the office coordinates. Use city pin instead removes the office. Address search sends explicit owner queries to Photon, with no API key; it never runs for public visitors. See [office address behavior and public data](docs/geography.md#optional-office-addresses).

The interactive D3 globe uses Natural Earth country and state/province outlines. Drag horizontally on touch, drag in any direction with a mouse, or use the labeled rotation/zoom controls. The role selector includes co-located jobs. Connections follow job start dates from earliest to latest, independently of the authored list order. Unknown locations break a route; ambiguous dates, co-located stops, and antipodal routes do not create misleading travel lines. Auto-rotation and route flow pause offscreen, in background tabs, during interaction, and for reduced-motion preferences. Boundaries load near the viewport, and lookup data loads only in the editor, one country at a time. Sources, licenses, and regeneration instructions are in [Geography data](docs/geography.md).

Continue zooming in to explore a Leaflet street map in the same panel, or choose **Street level** to jump to a mapped role's office or city. The monochrome map supports zoom through level 19 with street names, work markers, and chronological connections. Zoom out to world scale or choose **Back to globe** to return. Leaflet and external OpenStreetMap tiles load only when requested; no API key is needed. Markers use saved offices where provided and city centers otherwise. See [street map behavior and tile usage](docs/geography.md#street-level-exploration).

The service stores one document at `website/content`:

| Field | Stored value |
| --- | --- |
| `payload` | JSON string containing validated `SiteContent` |
| `revision` | Integer used for update consistency |
| `updatedAt` | Firestore server timestamp |
| `updatedBy` | Saving owner's Firebase Auth UID |

Content is public; do not publish private information in this document. The owner allowlist is separate from public site content.

The committed seed remains the fallback when there is no database content, no usable configuration, or offline/unavailable data. It also supplies the static HTML and SEO metadata. **CMS saves do not update prerendered HTML or static SEO.** Update the repository seed and rebuild/redeploy when the initial response, offline fallback, or static SEO must reflect new content.

## Deployment, checks, and rollback

Pull requests run `npm run test:rules` with Java 21 and `npm run verify`. All PR builds explicitly omit production Firebase client configuration, so preview editing is disabled and cannot write to the production database. Same-repository PRs receive seven-day Hosting previews after verification; forks receive checks only.

The **Firebase production** workflow runs on pushes to `main` and manual **Run workflow** on `main`. It serializes jobs with `firebase-production`, checks out the latest `main` after acquiring the lock, tests rules, verifies/builds using public repository variables, and checks remote `main` again before deploying Hosting. If the remote revision advanced or deployment failed, resolve the failure and rerun the workflow. It has no schedule, content-import job, or bot commits. Rules are never deployed by the Hosting workflow.

Production is blocked before the build if any of the five `VITE_FIREBASE_*` repository variables is missing or blank, or if `VITE_FIREBASE_PROJECT_ID` is not exactly `personal-website-f17c6`. Correct the repository variables and rerun the workflow. PR previews and local builds still support missing configuration with editing disabled.

Hosting serves the website directly at `/`. Legacy `/home`, `/home/`, and `/home.html` URLs redirect to `/` (301); clean URLs and a genuine 404 remain enabled. Before cutover, exercise owner sign-in, approved-email management, failed/successful saves, signed-out reads, and navigation with emulators and then the authorized target project.

For a Hosting regression, pause production runs, restore the previous release in Firebase Hosting history, and review/revert the source before resuming deployments. **Hosting rollback does not roll back Firestore content, the allowlist, or uploaded photos.** Restore content from a reviewed backup through an approved owner save, or use administrator recovery for database/allowlist problems. A revision number is not a content-history archive; keep backups before significant edits or rules changes.

Versions before the globe feature reject the new optional `experience[].place` field. Before rolling back to those versions, export a content backup and use a reviewed administrator migration to remove only each role's `place` field, retaining the original location labels. Prefer reverting presentation changes while keeping the updated parser so existing coordinates remain usable.

No existing cloud resources are deleted automatically. Keep ownership checks and verified backups for any later retirement. Dependency versions live in `package.json` and the lockfile; keep Node typings aligned with the runtime and review fresh production/full audits when updating the toolchain.

Firebase CLI 15.29.0 still requests Superstatic 10, whose supported Node versions stop at 24. The scoped npm override selects Superstatic 11.0.0 for its Node 26 support. Recheck and remove this override when Firebase CLI updates its dependency; Hosting emulator redirects, static assets, and 404 handling are verified with it.
