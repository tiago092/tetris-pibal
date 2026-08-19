# Tetris Pibal Agent Guide

## Project Shape

Tetris Pibal is a static browser game written in global JavaScript. There is no
frontend bundler or module system. npm is used only for tests, Supabase tooling,
and preparing the deployable `dist/` directory.

`index.html` loads scripts in dependency order. Preserve that order when adding
or moving browser code.

## Architecture

- `index.html` and `manifest.webmanifest`: browser shell, PWA metadata, canvas,
  touch-control styling, media elements, and script order.
- `js/config.js` and `js/constants.js`: tunable content, themes, difficulties,
  geometry, pieces, colors, scoring, and shared constants.
- `js/supabase-config.js` and `js/leaderboard.js`: public Supabase client
  configuration, online ranking, and localStorage fallback/cache.
- `js/media.js` and `js/audio.js`: background media and sound lifecycle.
- `js/render.js`, `js/menu.js`, and `js/animations.js`: canvas presentation.
- `js/game.js`: gameplay rules, state changes, scoring, and game-end persistence.
- `js/touch-controls.js` and `js/main.js`: touch/keyboard input, screen
  orchestration, canvas sizing, and the main loop.
- `scripts/`: syntax checks, Playwright smoke test, Supabase linking, and static
  deploy preparation.
- `supabase/migrations/`: versioned ranking schema, constraints, grants, and RLS.
- `.github/workflows/pages.yml`: tested GitHub Pages deployment.

## Working Agreements

- Keep the runtime framework-free and avoid bundlers or ES modules unless the
  requested change explicitly requires an architectural migration.
- Put tunable game content in `js/config.js`; keep rules in `js/game.js`, drawing
  in the rendering files, and input/orchestration in `js/main.js` or
  `js/touch-controls.js`.
- Make win/loss handling idempotent, especially calls to `onGameEnd` and score
  persistence.
- Unlock audio only from user interaction paths and clean up audio/video when
  changing levels, returning to the menu, winning, or losing.
- Preserve both ranking modes: Supabase when configured and localStorage when it
  is not. Never commit credentials. The browser anon key is public; enforcement
  belongs in Supabase constraints and RLS.
- Difficulty names are duplicated in `js/config.js` and the Supabase migration;
  update both together and preserve UTF-8 Spanish text.
- Use project-root-relative asset paths such as `assets/sound/example.mp3` and
  verify every new referenced asset exists.
- Keep deployment instructions in `DEPLOY.md` instead of duplicating them here.

## Verification

- Run `npm ci` once when dependencies are missing, then `npm test` after
  JavaScript changes.
- Run `npm run build` for deployment-related changes and inspect `dist/` without
  committing it.
- Manually exercise affected gameplay, menu, pause, win, and loss flows in a
  browser when behavior changes.
- For ranking changes, test malformed/empty localStorage, local fallback, remote
  reads, first insert, and updating an existing player's best score.
- For layout or input changes, test desktop keyboard and a coarse-pointer/mobile
  viewport. For PWA changes, verify the manifest and referenced icons.
