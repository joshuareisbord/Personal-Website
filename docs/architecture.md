# Code structure and maintenance

The website is a React application built with Vite and strict TypeScript. Firebase Hosting serves prerendered HTML and browser assets. Firebase Auth, Firestore, and Storage provide owner sign-in, content publishing, and photo uploads.

## Where to make a change

| Concern | Start here |
| --- | --- |
| Browser startup and hydration | `src/main.tsx` |
| Home versus 404 routing | `src/website.tsx` |
| Page composition and section order | `src/pages/home.tsx` |
| Header, introduction, biography, contact | `src/components/home/` |
| Shared footer and page frame | `src/layouts/main.tsx` |
| Design tokens and global styles | `src/styles/global.css` |
| Profile photo layout | `src/components/profile-photo.tsx`, `src/lib/photo-crop.ts` |
| Work experience list | `src/components/experience.tsx` |
| Globe, street map, and animated graphic | `src/components/geography/`; public entry components remain in `src/components/` |
| Owner dialog and session | `src/components/owner-access.tsx`, `src/components/owner-panel.tsx` |
| Content editor and draft lifecycle | `src/components/content-editor.tsx`, `src/components/editor/` |
| Date, location, address, photo, and crop controls | The named `*-picker.tsx` and `photo-cropper.tsx` components |
| Public content subscription | `src/hooks/use-published-content.ts` |
| Firebase operations | `src/lib/cms.ts`, `src/lib/cms/` |
| Content contracts and validation | `src/lib/content.ts`, `src/lib/profile.ts` |
| Chronological map routes | `src/lib/work-journey.ts`, `src/lib/street-map-data.ts` |
| Committed content and offline fallback | `src/data/site.ts`, `src/data/profile.json` |
| Static rendering and output checks | `src/entry-server.tsx`, `scripts/prerender.ts`, `scripts/verify-output.ts` |
| Geographic asset generation | `scripts/prepare-geography.ts`, `docs/geography.md` |

Entry components compose sections and connect state. Feature components describe the markup. Hooks own browser subscriptions, asynchronous loading, and effect cleanup. Pure helpers handle validation and geometry without a React lifecycle. Keep this separation when adding behavior; a small local helper does not need its own module unless it has a clear responsibility or is shared.

## Content flow

1. The build reads the committed seed and prerenders the home and 404 pages. The browser hydrates that same seed.
2. `usePublishedContent` subscribes to public Firestore content. The CMS validates each snapshot before replacing the displayed content. Invalid or unavailable content leaves the last validated version visible.
3. The owner dialog signs in through Google and checks the approved owner list. The editor starts with a local draft of the latest content and revision.
4. Saving validates the complete draft, uploads a pending photo when necessary, and performs a Firestore transaction against the expected revision. Failed saves retain the draft; a conflicting revision requires reloading the editor.

`cms.ts` is the stable entry point for callers. Inside `cms/`, `firebase.ts` initializes services, `auth.ts` handles identity and owner accounts, `content-store.ts` reads and publishes content, and `photo-store.ts` uploads images. `types.ts` defines their shared contracts. User-facing errors are sanitized by `errors.ts` so provider details and credentials are not exposed.

## Type and formatting conventions

- All executable application, test, and build code is TypeScript or TSX. JSON contains data/configuration, and CSS contains styling.
- Give exported functions explicit return types and components named props interfaces. Let TypeScript infer local values and contextually typed callbacks rather than duplicating obvious types.
- Derive content types from Zod schemas so runtime validation and compile-time contracts agree. Treat external JSON as untrusted until it is validated.
- Keep `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` enabled. Avoid `any`, non-null assertions, and TypeScript suppression comments in application code.
- Declare client environment keys in `src/vite-env.d.ts`. Missing Firebase configuration is supported; misspelled environment keys fail type checking.
- Run `npm run format`. The committed Prettier configuration governs multiline JSX, indentation, and line wrapping. Do not compress multiple statements or JSX sections onto one line by hand.
- Use named constants or small helpers when a condition needs explanation. Comments should explain lifecycle requirements, unusual geometry, or intentional compatibility behavior.

## Behavior to preserve

- Optional contact details, existing content, field labels, section anchors, and `/home` redirects remain compatible.
- Public visits never require login. Firebase rules remain the authorization boundary; hiding owner controls does not grant or revoke access.
- A draft never publishes automatically. Retrying a failed save reuses an uploaded photo when possible. Selecting a new photo clears its old crop; reverting restores the prior framing.
- Dates retain their original precision. Unknown locations and ambiguous chronology do not invent travel routes. Office coordinates affect map pins while job labels remain city/state/country.
- Animation starts from the prerendered pose and respects reduced motion, visibility, and interaction. Browser effects remove listeners and cancel pending work when their component unmounts.
- Decorative link arrows use SVG, not emoji-capable text glyphs.

## Verification

`npm run verify` checks formatting, TypeScript, unit/render tests, and the full production build. The same command runs in GitHub Actions. `npm run test:rules` separately exercises Firestore and Storage authorization in the demo emulator project.

For UI changes, exercise the affected controls in a browser at mobile and desktop widths. For CMS changes, use the demo emulators described in the README to test sign-in, editing, publishing, and signed-out reads without writing to production. Build output verification checks static routing, local assets, and known credential patterns; it does not replace browser interaction checks.

The untracked `.firebase/` folder may contain local fixtures and screenshots. It is not application source and must not be deployed or used as the committed content seed.
