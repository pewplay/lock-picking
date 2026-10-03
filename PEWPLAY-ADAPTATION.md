# Lock Picking for PewPlay

This directory contains the original static game adapted for the PewPlay game template. Open `index.html` to play.

`game.json` holds the game page text. `preview.png` and `cover.png` provide the page images. The PewPlay workflow checks pushes to `preview` and `main`. The game remains a draft until you remove `"draft": true` after reviewing it.

Game controls: Click the spinning lock when the moving pointer aligns with its target. Clear all stages without missing.

## Update (October 2026)
- Rebuilt on a DPR-aware canvas that fills the screen at any size/orientation; no Google Fonts CDN.
- Input: tap/click anywhere (pointerdown, no click latency), Space/Enter, start screen and in-page win/miss panels.
- Fixed the angle-comparison bug (pins beyond +-180 degrees could never be hit) and the pick stopping after 15 seconds; pick now spins at a steady speed that rises slightly after each hit, new pins always appear ahead of the pick.
- Added sound with mute button (`lock-picking:muted`), saved stats (`lock-picking:stats`), pause on hidden page. New cover and screenshots.
