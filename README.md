# CoLab Reef

Real-time classroom app: a teacher dashboard, projector view and student app that run 12 collaborative
learning activities with a built-in praise engine. React + Vite, Supabase (Postgres + Realtime).

## Run it
```bash
npm install
npm run dev
```
With no `.env` the app runs in **demo mode**: data lives in the browser and syncs between tabs on one
device. Open the teacher dashboard in one tab and join as students in other tabs.

## Live database
The published site uses the Supabase project in `.env.production` (address and publishable key; both are public values).
One-time setup of a project: run `supabase/schema.sql`, then `supabase/update-1.1.sql`, in its SQL editor.
There are no email accounts: the single teacher creates a passcode on first use. To reset a forgotten passcode, run
`delete from app_settings;` in the SQL editor and create a new one. To use a different project, change the two
values in `.env.production` and push. For local development against it, copy `.env.production` to `.env`.

## Link
**https://mrhany80.github.io/Colab.-Reef-Classroom/** — published by GitHub Pages on every push to `main`
(`.github/workflows/pages.yml`). One-time step: Settings > Pages > Source: **GitHub Actions**.
Students open the same address and enter the session code, or scan the QR code on the projector.

## Publishing a release
1. Raise `version` in `package.json` and add a `## <version>` section to `CHANGELOG.md`.
2. Push to `main`.
3. `.github/workflows/release.yml` sees a version with no release, builds the web app, creates the tag `v<version>`
   and publishes the release with the notes from `CHANGELOG.md` and `CoLab-Reef-<version>.zip` (the built site).
   To rebuild a release that exists: **Actions > Release > Run workflow**.

The version is shown at the bottom of the first screen.

## Routes
`#/teacher` dashboard · `#/control/CODE` teacher control · `#/projector/CODE` projector ·
`#/report/CODE` report · `#/join` student join · `#/s/CODE` student app

## Structure
- `src/lib/store.js` data layer (Supabase or demo), `live.js` session sync, grouping, timers
- `src/lib/praise.js` behaviour detection, praise sentences, reinforcement schedule
- `src/modules/` the 12 activities (student, teacher and projector view each)
- `src/lib/content.js` sample classes and biology content
