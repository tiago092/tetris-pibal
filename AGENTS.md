# Tetris Pibal Agent Guide

This repository is a plain browser Tetris game. `index.html` loads global JavaScript files from `js/` in a fixed order and uses local media assets from `assets/`.

## Architecture

- `index.html`: canvas host, game-over video element, script load order.
- `js/config.js`: menu/win config, level themes, asset paths, difficulties.
- `js/constants.js`: canvas size, board geometry, pieces, colors, scoring, shared constants.
- `js/leaderboard.js`: localStorage ranking behavior.
- `js/media.js`: background image/video setup and playback helpers.
- `js/audio.js`: music and sound effect helpers.
- `js/render.js`: in-game canvas drawing.
- `js/menu.js`: menu, leaderboard, credits, difficulty, and countdown drawing.
- `js/animations.js`: death, win, explosion, particles, text effects.
- `js/game.js`: Tetris rules, state creation, line clearing, level changes, game-end score save.
- `js/main.js`: canvas setup, input handling, high-level screens, and main loop.

## Codex Guidance

- Keep the project no-build unless explicitly asked otherwise.
- Do not introduce frameworks, bundlers, package managers, or ES modules casually.
- Preserve the global script order in `index.html`.
- Keep edits scoped to the requested behavior.
- Prefer adding small helper functions inside the existing module that owns the behavior.
- Put tunable game content in `js/config.js` instead of hard-coding it in game logic.
- Keep gameplay rules in `js/game.js`, rendering in `js/render.js` or `js/menu.js`, and orchestration/input in `js/main.js`.
- Be careful with browser audio autoplay restrictions; unlock/play audio from user interaction paths.
- Make win/loss flows idempotent where possible, especially around `onGameEnd`.
- Treat asset paths as project-root relative paths like `assets/sound/example.mp3`.
- When changing Spanish text, preserve UTF-8 encoding.

## Verification

- For small content/config edits, check that referenced assets exist.
- For gameplay edits, run the game in a browser and manually verify the affected flow.
- For leaderboard edits, test empty, existing, and malformed localStorage data when practical.
- For media edits, verify audio/video cleanup when changing levels, returning to menu, winning, or losing.

## Codex Subagent Profiles

Codex subagents are created dynamically during a session. These profiles are guidance, not persistent agent definitions.

Use subagents only when work is large, ambiguous, risky, or parallelizable. For small changes, Codex should work directly.

### Game Explorer

- Type: `explorer`
- Effort: `medium`
- Mode: read-only
- Use for investigating one subsystem before implementation.
- Good targets: game loop, win/loss flow, audio/video lifecycle, leaderboard, rendering.

### JS Game Worker

- Type: `worker`
- Effort: `medium`
- Mode: edit assigned files only
- Use for scoped implementation tasks.
- Assign clear ownership, for example `js/game.js` or `js/render.js`.
- Avoid broad rewrites and preserve the no-build setup.

### Game Reviewer

- Type: `explorer`
- Effort: `medium`
- Mode: read-only
- Use after meaningful changes.
- Review `git diff`, state transitions, duplicate score saves, media cleanup, asset paths, and encoding.

### Refactor Worker

- Type: `worker`
- Effort: `high`
- Mode: edit assigned files only
- Use only for risky changes touching game loop, global state, or multiple modules.

## Claude Subagents

Claude-specific subagents live in `.claude/agents/`. They are useful for Claude Code workflows, but Codex does not automatically use those files as subagents. Codex should follow this `AGENTS.md` file as project guidance.
