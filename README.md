# Grambo Family App

Preact + Vite PWA for viewing schedules, knowledge, and tasks from the [grambo-family](https://github.com/rossgrambo/grambo-family) knowledge vault.

This repo is deployable to GitHub Pages so a wall-mounted tablet / touch monitor can load it via Home Assistant's `panel_iframe`.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Outputs static assets to `dist/`.

## How it works

- Auths to GitHub with a personal access token stored in `localStorage` (see `src/lib/settings.ts`).
- Reads and writes files in the `grambo-family` repo via the Contents API (`src/lib/github.ts`).
- Each task mutation is its own commit.
- Loads tasks from `knowledge/tasks/` and schedules from `knowledge/schedules/`.
