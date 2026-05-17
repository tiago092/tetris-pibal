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
   - `Project ref`
   - database password

Create the table and policies:

1. Open `supabase/migrations/20260517000000_create_scores.sql`.
2. Copy the full SQL.
3. In Supabase, go to `SQL Editor`.
4. Paste and run it.

That SQL:

- creates `public.scores` if it does not exist;
- enables RLS;
- allows public ranking reads;
- allows valid score inserts;
- does not delete scores;
- does not insert data.

## 2. Connect the game

Copy `.env.example` to `.env` and fill it in:

```txt
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_DB_PASSWORD=your-db-password
```

Generate the public config:

```powershell
npm run supabase:config
```

This updates `js/supabase-config.js`.

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

## 5. Upload to static hosting

Upload the contents of `dist/` to any static host:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- S3/CloudFront
- any HTTP server

Hosting settings:

- Build command: `npm run build`
- Publish/output directory: `dist`
- Node version: `24`

## 6. Manual smoke test

After deploy:

1. Open the public URL.
2. Finish a game.
3. Confirm the score appears in Supabase table `public.scores`.
4. Open the in-game ranking and confirm it loads.

## Important

Do not upload `.env`. Only `js/supabase-config.js` is published, and it contains
public data required by the web app.

The anon key is public in a web app. That is fine while RLS is enabled and the
policies match the versioned SQL.
