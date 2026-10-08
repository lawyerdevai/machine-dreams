# Datagrams: how the pieces fit

weekly cron -> /api/datagrams/generate -> real numbers + previous weeks -> Claude writes a scene file -> lint -> store (draft)
render-datagram.mjs -> plays the scene in the same player with a fixed clock and seed -> MP4 + X MP4 + still -> --publish flips it live
/datagrams -> sandboxed iframe plays the published scene; the page shows title, note, the five numbers, "why it looks like this", and the scene hash

Determinism: seed = first 8 hex chars of sha256(scene). The page and the renderer use the same rule, and the same scene + seed gives identical frames.
Loop: renders 12 s + 1.5 s, and the last 1.5 s are crossfaded into the first, so the MP4 loops without a visible seam.
Outputs: `<week>.mp4` 1200x1200 (OpenSea animation_url), `<week>-x.mp4` 720x720 H.264 (X), `<week>.png` 3000x3000 (OpenSea image).
Publish the sha256 of the scene file at mint so anyone can verify the scene they are shown is the one that was minted.
Risk to know: scene code is written by Claude and runs in the visitor's browser inside a sandboxed iframe (no access to your site, cookies or wallet). A scene that loops forever would only freeze its own tab, which is why weeks stay drafts until a render succeeds.
