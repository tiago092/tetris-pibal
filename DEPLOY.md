# Deploy

Tetris Pibal is a static site. There is no frontend bundler.

## 1. Prepare Supabase

Create or connect a Supabase project for the online ranking.

This repo does not migrate scores. It only defines the table, constraints, RLS,
and policies.

In the Supabase Dashboard:

1. Create a project.
2. Copy:
   - `Project URL`
   - `anon public key`

Create the table and policies:

1. Open `supabase/migrations/20260517000000_create_scores.sql`.
2. Copy the full SQL.
3. In Supabase, go to `SQL Editor`.
4. Paste and run it.

That SQL:

- creates `public.scores` if it does not exist;
- enables RLS;
- allows public ranking reads;
- allows valid score inserts and updates;
- keeps one score row per player name;
- removes duplicated player names, keeping the highest score;
- does not insert data.

Run this SQL again whenever the migration changes. It is written to be safe for
an existing `public.scores` table.

## 2. Connect the game

For local builds, copy `.env.example` to `.env` and fill it in:

```txt
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
```

`.env` is only for your machine and must stay ignored by git. The browser never
loads `.env` directly. The build step converts `SUPABASE_URL` and
`SUPABASE_ANON_KEY` into the public file `dist/js/supabase-config.js`.

## 3. Verify

```powershell
npm install
npm test
```

## 4. Prepare the static output

```powershell
npm run build
```

This creates `dist/` with:

- `index.html`
- `manifest.webmanifest`
- `assets/`
- `js/`

## 5. Deploy to GitHub Pages

This repo includes `.github/workflows/pages.yml`. On every push to `main` or
`master`, GitHub Actions runs the tests, builds `dist/`, and deploys it to
GitHub Pages.

Add these repository secrets in GitHub:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

GitHub path:

1. Open the repo on GitHub.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Add both secrets.
4. Go to `Settings` -> `Pages`.
5. Set `Source` to `GitHub Actions`.
6. Push to your deploy branch (`master` in this local repo).

Do not add `.env` to git. GitHub Actions reads the secrets and generates
`dist/js/supabase-config.js` during `npm run build`.

## 6. Other static hosting

Upload the contents of `dist/` to any static host:

- Netlify
- Vercel
- Cloudflare Pages
- S3/CloudFront
- any HTTP server

Hosting settings:

- Build command: `npm run build`
- Publish/output directory: `dist`
- Node version: `24`

## 7. Manual smoke test

After deploy:

1. Open the public URL.
2. Finish a game.
3. Confirm the score appears in Supabase table `public.scores`.
4. Open the in-game ranking and confirm it loads.

## Important

Do not upload `.env`. Only `dist/js/supabase-config.js` is published, and it
contains public data required by the web app.

The anon key is public in a web app. That is fine while RLS is enabled and the
policies match the versioned SQL.
