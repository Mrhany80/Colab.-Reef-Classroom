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

## Publishing
Every push to `main` rebuilds the app and publishes it on GitHub Pages
(`.github/workflows/pages.yml`). One-time step: Settings > Pages > Source: **GitHub Actions**.

## Routes
`#/teacher` dashboard · `#/control/CODE` teacher control · `#/projector/CODE` projector ·
`#/report/CODE` report · `#/join` student join · `#/s/CODE` student app

## Structure
- `src/lib/store.js` data layer (Supabase or demo), `live.js` session sync, grouping, timers
- `src/lib/praise.js` behaviour detection, praise sentences, reinforcement schedule
- `src/modules/` the 12 activities (student, teacher and projector view each)
- `src/lib/content.js` sample classes and biology content
