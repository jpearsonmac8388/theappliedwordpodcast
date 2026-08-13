# The Applied Word — app

This is a static, installable PWA for **The Applied Word**. It has no build step.

## Main tabs

- **Devotion** — Today’s devotional, the M’Cheyne reading plan, and Spurgeon’s *Morning and Evening*.
- **Podcast** — The Applied Word Spotify show embedded directly in the app, plus buttons to open/follow the show in Spotify.
- **Bible** — A full Berean Standard Bible reader.
- **History** — Recent reading/activity plus saved highlights, notes, and bookmarks.

Settings are available from the gear button in the header.

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

The Spurgeon tab also works on plain static hosting. On first use it downloads the complete public-domain *Morning and Evening* dataset and stores it in IndexedDB for future/offline reading.

The Cloudflare Pages function in `functions/spurgeon/[[path]].js` is retained only as a compatibility fallback; it is not required for GitHub Pages.

### Cloudflare Pages

No build command is required. Set the output directory to the repository root. Cloudflare Pages will also run the optional Spurgeon fallback function automatically.

## Brand assets

- `assets/podcast-cover.jpg` — supplied Applied Word artwork used on the Podcast tab
- `icons/icon-master.svg` — editable app-icon source
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/icon-maskable-512.png`
- `icons/apple-touch-icon.png`
- `icons/favicon.png`

The refreshed icon uses the same dark leather and muted-gold shield / sword / compass visual language as the supplied podcast artwork.

## Local data

The app keeps reading data on the device:

- IndexedDB: downloaded BSB text and cached Spurgeon Morning & Evening collection
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


## Spurgeon Morning & Evening

The Spurgeon tab downloads the public-domain dataset once and caches it in IndexedDB, so it works on GitHub Pages and offline after the first successful load. The static dataset comes from the `russianryebread/morning-and-evening` repository; CCEL remains the source link and compatibility fallback.
