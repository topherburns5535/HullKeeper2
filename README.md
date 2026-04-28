# HullKeeper

HullKeeper is a mobile-friendly arcade survival game built with Next.js, React, and TypeScript. You steer a vacuum head across the board, collect falling debris, manage shield and hull pressure, and use abilities like Slow and Nuke to survive increasingly crowded waves.

## Status

HullKeeper is in active development. The core gameplay loop, debris variants, support bots, powerups, vacuum transport visuals, and verification script are all present, but the project should still be treated as an evolving game rather than a final release.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

## Available Scripts

- `npm run dev` - start the local development server
- `npm run build` - create a production build
- `npm run start` - serve the production build
- `npm run lint` - run ESLint
- `npm run verify:game` - run the custom gameplay verification script

## Controls

- Drag your mouse or finger across the board to move the vacuum head.
- Keep debris from settling on the hull for too long.
- Tap the bottom ability buttons to trigger `Slow` or `Nuke` when they are ready.
- Choose upgrades between level-ups to improve range, power, tempo, abilities, and shield recovery.

## Asset Notes

- Main gameplay art lives in `public/assets`.
- Debris art lives in `public/assets/debris`.
- Menu backgrounds and custom button art live in `public/assets/ui`.
- Vacuum, transport, and shield-contact visuals live in `public/assets/vacuum`.
- Bot sprites live in `public/assets/bots`.
- There is currently no `public/assets/backgrounds` folder; the menu background is stored under `public/assets/ui`.

## Project Structure

- `app` - Next.js app entrypoints
- `components` - gameplay UI and rendering
- `lib/game` - game state, reducers, helpers, and tuning
- `scripts` - project verification scripts

## Publishing Notes

- Do not commit `node_modules`, `.next`, local logs, or temporary folders.
- Review `next.config.ts` before publishing if you do not want local dev origins committed.
- Run `npm run lint`, `npm run verify:game`, and `npm run build` before pushing changes.
