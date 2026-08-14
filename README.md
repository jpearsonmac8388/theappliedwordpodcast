# The Applied Word Podcast — app

This is a static, installable PWA for **The Applied Word Podcast**. It has no build step.

## Main tabs

- **Devotion** — Today’s devotional and the M’Cheyne reading plan.
- **Podcast** — The Applied Word Podcast Spotify show embedded directly in the app, plus buttons to open/follow the show in Spotify.
- **Bible** — A full Berean Standard Bible reader.
- **History** — Recent reading/activity plus saved highlights, notes, and bookmarks.

Settings are available from the gear button in the header.

## Install prompt

A temporary floating **Install App** button is included for mobile browsers. It disappears when the app is installed or when the user dismisses it for the current browser session.

- **Android / Chromium:** the app captures `beforeinstallprompt` and launches the browser's native install confirmation when it is available. If the browser has not made the native prompt available yet, the button shows manual Install app / Add to Home screen instructions.
- **iPhone / iPad:** Safari does not expose the Chromium install prompt, so the button shows Apple's Add to Home Screen flow: Share → Add to Home Screen → Open as Web App → Add. If the page is open in another iOS browser, the guide tells the user to open it in Safari first.
- The install promotion is hidden automatically in standalone / installed mode.

## Bible reader

The app includes the official Berean Standard Bible plain-text file at:

`data/bsb.txt`

The user taps **Download BSB** once. The app parses the text and stores the Bible in IndexedDB for offline reading. The large source file is intentionally not duplicated in the service-worker cache.

Reader features include:

- all 66 books and chapter navigation
- full-Bible word search and direct reference search
- adjustable reading text size
- five highlight colors plus clear highlight
- verse notes
- chapter bookmarks
- native verse sharing with clipboard fallback
- verse copying
- generated social-media verse cards in 9:16, 4:5, and 1:1
- recent activity history and a saved-items view

The Berean Bible publisher states that the Berean Bible text was dedicated to the public domain on April 30, 2023. Official source:
`https://berean.bible/terms.htm`

Official downloads:
`https://berean.bible/downloads.htm`

## Podcast

The Spotify show used by the app is configured at the top of `app.js`:

- `SHOW_URL`
- `EMBED_URL`

Change those two values if the show URL ever changes.

## Hosting

### Static hosting / GitHub Pages

The complete Bible reader now works on static hosting because the BSB source file is included locally. GitHub Pages, Netlify, Cloudflare Pages, or another HTTPS static host can serve the app.


### Cloudflare Pages

No build command is required. Set the output directory to the repository root.

## Brand assets

- `assets/podcast-cover.png` — supplied Applied Word artwork used on the Podcast tab
- `icons/icon-master.svg` — editable app-icon source
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/icon-maskable-512.png`
- `icons/apple-touch-icon.png`
- `icons/favicon.png`

The refreshed icon uses the same dark leather and muted-gold shield / sword / compass visual language as the supplied podcast artwork.

## Local data

The app keeps reading data on the device:

- IndexedDB: downloaded BSB text
- localStorage: highlights, notes, bookmarks, streak, plan completion, reader text size, and activity history

Settings includes an export for marks/bookmarks/activity and reset controls.

## Files

- `index.html` — app shell and primary navigation
- `styles.css` — full UI / brand styling
- `app.js` — views, reader controls, activity history, sharing, cards
- `bible.js` — BSB parser, IndexedDB storage, book metadata
- `content.js` — devotion content
- `mcheyne.js` — reading plan data
- `data/bsb.txt` — public-domain BSB source text
- `sw.js` — offline app-shell service worker
- `manifest.webmanifest` — PWA metadata


- v18: verse-card typography tightened to more closely match the supplied Roman-serif reference, with stronger weight, tighter leading, darker ink, and larger safe margins.
