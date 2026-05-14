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

## Trust model

**This repo (the app) is public. The `grambo-family` data repo is private.** That split is intentional — GitHub Pages requires a public repo for free hosting, but the family knowledge stays private.

How the boundary holds:

- The published site at `https://rossgrambo.github.io/grambo-family-app/` is just the static HTML/JS/CSS shell. No family data is baked in at build time.
- At runtime the app reads/writes `rossgrambo/grambo-family` via the GitHub Contents API, authenticated with a personal access token the user pastes into Settings on first load.
- The token lives in `localStorage` on each device. It is never committed, never logged, and never sent to any server other than `api.github.com`.
- Without a valid token scoped to the private repo, every API call returns 404 and the app shows no data.

**Per-device setup:** open the site, go to Settings, paste a fine-grained PAT scoped only to `rossgrambo/grambo-family` with `Contents: read & write`. Do NOT use a classic `repo`-scoped token — that grants access to every repo on the account.

**Risks to keep in mind:**

- `localStorage` on `*.github.io` is a shared origin with every other GitHub Pages site. A malicious GH Pages site visited in the same browser could in principle read the token. Low practical risk; mitigate by using a dedicated browser profile on shared devices or kiosk-locking wall tablets to one URL.
- The app renders markdown via `marked`. A malicious markdown file in the vault could exfiltrate the token via injected HTML. Since only trusted family members write to the vault, this is acceptable — but don't paste untrusted markdown into knowledge notes.
- Set a PAT expiry (e.g. 90 days) so a leaked token self-heals. Rotate by generating a new token and updating Settings on each device.
