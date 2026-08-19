# Deploy

Tetris Pibal runs as a static site without a frontend bundler. Its build command
copies the browser files to `dist/` and injects the public Supabase configuration
used by the online ranking.

## 1. Prerequisites

- Node.js 24, matching `.nvmrc`
- npm
- A Supabase project for the online ranking

Install the locked dependencies and the Playwright browser used by the smoke
test:

```sh
npm ci
npx playwright install chromium
```

## 2. Configure the environment

Copy `.env.example` to `.env` and replace its placeholders:

```txt
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_DB_PASSWORD=
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` configure the game build.
`SUPABASE_PROJECT_REF` is used by `npm run supabase:link`.
`SUPABASE_DB_PASSWORD` is optional and is only passed to the Supabase CLI when
set.

`.env` is local-only and ignored by git. The browser never reads it directly.

## 3. Apply the Supabase schema

The preferred workflow uses the versioned migration through the Supabase CLI:

```sh
npm run supabase:login
npm run supabase:link
npm run supabase:push
```

The migration creates `public.scores`, constraints, indexes, grants, and RLS
policies. It also deduplicates existing player names, keeping the best score.
It does not copy scores between Supabase projects or insert seed scores.

As a manual alternative, open each pending file in `supabase/migrations/` in
timestamp order, copy its complete SQL, and run it in the Supabase Dashboard SQL
Editor. Record which files were applied; use new forward migrations for later
database changes instead of silently editing production history.

## 4. Test and build

Run the automated checks:

```sh
npm test
```

Prepare the static output:

```sh
npm run build
```

The build copies `index.html`, `manifest.webmanifest`, `assets/`, and `js/` into
`dist/`. When both Supabase variables are present, it writes them to
`dist/js/supabase-config.js`.

If neither `SUPABASE_URL` nor `SUPABASE_ANON_KEY` is set, the build succeeds with
a warning and produces a local-ranking-only deployment. If only one is set, the
build fails. Treat a local-only warning as a failed release when online ranking
is required.

## 5. Deploy to GitHub Pages

`.github/workflows/pages.yml` runs on pushes to `main` or `master`, and can also
be started manually. It installs dependencies and Chromium, runs the tests,
builds `dist/`, and deploys it to GitHub Pages.

Add these repository secrets under `Settings` -> `Secrets and variables` ->
`Actions`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Then set `Settings` -> `Pages` -> `Source` to `GitHub Actions` and push to the
deployment branch. This repository currently uses `master`.

The Pages workflow does not apply database migrations. Run the Supabase CLI flow
or the manual SQL flow separately whenever the migration changes.

## 6. Other static hosts

For Netlify, Vercel, Cloudflare Pages, S3/CloudFront, or another static host, use:

- Build command: `npm run build`
- Publish directory: `dist`
- Node.js version: `24`
- Environment variables: `SUPABASE_URL` and `SUPABASE_ANON_KEY`

Upload the contents of `dist/`, not the repository root and never `.env`.

## 7. Post-deploy verification

1. Open the public URL and check that the game loads without console errors.
2. Verify keyboard controls on desktop and touch controls on a mobile or
   coarse-pointer viewport.
3. Finish a game with a new player name and confirm the row appears in
   `public.scores`.
4. Beat that score using the same name and confirm the existing row is updated.
5. Open the in-game ranking and confirm the remote top scores load.
6. Check that `manifest.webmanifest`, its icons, audio, images, and video load
   from the deployed subpath.

## Troubleshooting and security

- If the game reports a local ranking, inspect the deployment environment and
  the generated `dist/js/supabase-config.js`.
- If inserts work but improving an existing score fails, apply all pending
  migrations and inspect the Supabase RLS policy for updates.
- If the smoke test cannot find Chromium, run `npx playwright install chromium`.
- The anon key is expected to be public in a browser application. Do not use a
  service-role key. Data protection depends on the versioned constraints and RLS
  policies remaining enabled.
- To roll back frontend code, redeploy a known-good commit. Prefer a new forward
  migration for database corrections instead of editing an already-applied
  migration in production history.
