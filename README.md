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

## Go live (real classroom, many devices)
1. Create a Supabase project. In the SQL editor, run `supabase/schema.sql`.
2. Copy `.env.example` to `.env` and paste the project URL and anon key.
3. On GitHub: Settings > Secrets and variables > Actions > Variables, add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`, then re-run the "Publish web app" workflow.
4. Open the site, choose "I am a teacher", create a teacher account. Three sample classes are seeded.

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
