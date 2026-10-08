# Paste this into Cursor (Agent mode, on branch `datagrams`)

The zip you unpacked contains finished files. **Copy them into the repo exactly as they are, at the same paths. Do not rewrite, simplify, "shim" or reformat them.** If a file seems wrong, tell me what and why instead of changing it.

Files and where they go (paths are relative to the repo root):

- `public/datagrams/player.html`  the art engine, one static file. Do not edit. It runs inside a sandboxed iframe.
- `app/datagrams/page.tsx` and `app/datagrams/DatagramPlayer.tsx`  replace the current Datagrams page. Move the old page to `app/datagrams/_old/` so it is not routed but not lost.
- `app/api/datagrams/generate/route.ts`  writes the week's scene with the Anthropic API (the weekly job).
- `app/api/datagrams/publish/route.ts`, `app/api/datagrams/week/[week]/route.ts`
- `lib/datagrams/*`  `spec.ts` is PRIVATE (the prompt). Never import it from a client component, never put it in /public.
- `scripts/render-datagram.mjs`  renders the MP4 and still.
- `vercel.json`  weekly cron. If the repo already has a vercel.json, merge the `crons` entry instead of replacing it.
- `.env.example.datagrams`  add those names to the repo's env docs and to Vercel (ANTHROPIC_API_KEY, CRON_SECRET, DATAGRAMS_MODEL, DATAGRAMS_AUTOPUBLISH).

Then do ONLY these three things, in this order:

1. **Wire the real data.** In `lib/datagrams/week.ts`, implement `fetchWeekStats`. Find the Normies Pixel Market client this repo already uses (fills, stats, candles, listings), use it for the week range, adapt the field names in `computeStats` to what the API really returns, and return the five numbers. Do not invent endpoints. If you cannot find one, stop and tell me.
2. **Wire storage.** `lib/datagrams/store.ts` writes JSON files, which does not work on Vercel. Re-implement `putWeek`, `getWeek`, `listWeeks`, `latestPublished` with the persistence this repo already uses (database, KV or Blob). Keep the signatures.
3. **Check it builds.** `npm run build` and fix only real type or import errors in the new files (the `@/` alias, Next version differences such as sync vs async `params`). Do not touch the engine or `spec.ts`.

Test, in this order:

- `npm run dev`, then `curl "http://localhost:3000/api/datagrams/generate?mock=1&dry=1"` ten times. Each call is one fake week from Claude (takes about a minute). Read the titles and rationales; tell me which look wrong.
- `curl "http://localhost:3000/api/datagrams/generate?mock=1&week=2026-10-05"` with `DATAGRAMS_AUTOPUBLISH=1`, then open `/datagrams`.
- `npm i -D playwright`, then `node scripts/render-datagram.mjs 2026-10-05`. Output lands in `out/datagrams/` (add that folder to .gitignore).

Rules for the whole task: no names, logos or signature works of real artists anywhere in code, prompts or UI. No text, letters or numbers drawn in the artwork. Do not change how the art looks.
