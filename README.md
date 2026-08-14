# The Applied Word Podcast — app

This is a static, installable PWA for **The Applied Word Podcast**. It has no build step.

## Main tabs

- **Devotion** — Today’s devotional and the M’Cheyne reading plan.
- **Podcast** — The Applied Word Podcast Spotify show embedded directly in the app, plus buttons to open/follow the show in Spotify.
- **Bible** — A full Berean Standard Bible reader.
- **History** — Recent reading/activity plus saved highlights and notes.

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
- localStorage: highlights, notes, streak, plan completion, reader text size, and activity history

Settings includes an export for marks/activity and reset controls.

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


## v19 updates
- Expanded the daily devotional library to 365 entries (one for each day of the year).
- Reworked devotional hero images around the Armor of God (Ephesians 6:10–18): belt, breastplate, shoes, shield, helmet, and sword.
- Replaced oversized rotating images with optimized 900×600 JPG assets for smoother loading.


## v20 updates
- Swapped devotional hero artwork to new Armor of God image paths and overlaid matching Cinzel-styled captions with the related Ephesians 6 references.
- Made the Reading Plan info card square and added spacing between the Spotify button and the Listen Anywhere box.
- Added a full Notes section with Sermon Notes, Prayer Requests, Bible Study Notes, and Men’s Group Notes, including a markdown toolbar, preview mode, and export support.


## v21 — Bible library, touch selection, categories, modern themes
- Added downloadable ASV, YLT, and KJV translations alongside the BSB. Each translation is imported into IndexedDB only when the user taps Download, matching the existing BSB offline flow.
- Added an installed-translation selector in the Bible reader and a multi-translation Bible Library in Settings.
- Verse selection is now touch-first: tap any number of verses, then highlight, copy, create a verse card, add to a named category, or attach a note from a floating action bar.
- Added named Verse Categories. Categories are reference-based, so a saved category remains useful when switching Bible translations.
- Verse categories are included in exported app backups.
- Added Evergreen, Graphite, and Sandstone themes and refreshed the UI with cleaner surfaces, spacing, controls, navigation, and typography while keeping the existing screen layout.

### Bible text sources and rights
- BSB: bundled public-domain Berean Standard Bible source already used by the app.
- ASV (1901): public-domain text.
- YLT: public-domain text by Robert Young.
- KJV: public domain in the United States. Special Crown rights can apply to printed publication/import in the United Kingdom.
- ASV/KJV/YLT app data files were normalized from the Scrollmapper Bible Databases plain-text editions into the same tagged verse format used by the BSB importer.

## v22 design and notes update
- Sermon Notes, Bible Study Notes, and Men’s Group Notes are now saved as separate titled documents with list previews and timestamps.
- Prayer Requests are now unlimited-length list items with active/answered status.
- The Markdown editor toolbar is a compact single-row ribbon.
- Added persistent nested back navigation in the app header and logical back behavior for Settings, verse cards, Reading Plan, Bible subviews, categories, and note editors.
- Stabilized the mobile viewport and increased all editable control font sizes to prevent iOS focus zoom and off-center layout shifts.
- Unified cards, buttons, controls, spacing, and interactive states around the active theme.
- The new structured notes library is included in app backup exports.

## v23 — reminders, prayer focus, and notifications

- Notes and prayer requests can now have one-time, daily, weekly, or monthly reminders.
- Prayer requests support categories, pinning, answered/active state, and a Today’s Prayer feed.
- Prayer categories: Family, Personal, Health, Salvation, Guidance, Provision, Relationships, Church, World & Missions, Thanksgiving, and Other.
- Notification permission can be enabled in Settings or from a reminder.
- The app checks reminders while it is running, on focus/visibility changes, and when it opens.
- Podcast release alerts can be enabled for Monday at 6:00 AM Pacific.
- Reminder metadata, prayer categories/pins, and notification preferences are included in the JSON app backup.

### Web notification limitation

This remains a static PWA. Browser notification permission lets the app show OS notifications while it is active, and the service worker can display notifications when invoked. Reliable push delivery while the app is fully closed requires a web-push sender/backend (or another push service) to send Push API messages to subscribed devices. The Monday podcast alert in this static build therefore uses the known release schedule and is checked by the app rather than polling Spotify in the background.

## v25 updates
- Cleaned up the M’Cheyne Reading Plan controls and replaced the old track selector with **1 Year** and **6 Month** plans. The 6 Month option combines two consecutive M’Cheyne calendar days per app day.
- Tightened the reading-reminder time control and replaced the ambiguous View Date box with a centered Reading Date navigator.
- Increased bottom-navigation icon and label sizes slightly without making the bar bulky.
- Switched new-episode detection from Spotify Web API credentials to the built-in Anchor/Spotify for Creators RSS feed. Listener UI now only exposes Turn On / Turn Off; the push Worker URL is an owner-side deployment setting in `push-config.js`.
- Increased the verse-card logo while preserving border clearance, enlarged the Scripture reference/translation, added a clearer Justin McFadden credit, and increased/raised the tagline.
- Reworked Prayer Requests into preview cards with category, preview, reminder status, and Mark Answered. Tapping a card opens a dedicated full prayer editor.
- Replaced the visible Markdown editor workflow with a compact one-line rich-text toolbar supporting bold, italic, underline, heading, bullets, numbering, checklist insertion, quote, undo, and redo.


## v26
- Removed Justin McFadden from generated verse cards.
- Podcast alert toggle no longer throws a configuration error when a remote push backend URL is absent; it enables the app's built-in notification fallback while preserving real Web Push whenever a deployed service URL is present.


## v28
- Bible verse selection actions now fit on a single non-scrolling row.
- Bookmark controls were removed from the Bible experience.
- Verse selections clear after an action is completed.
- Note and prayer reminder dialogs are forced above the bottom navigation and save controls.
- Reading-plan date and plan fields use smaller, contained typography to prevent overlap.


## v29 updates
- Tightened Reading Plan start-date and plan controls; plan choices now show daily reading counts.
- New/reset plans default to the current date and the redundant in-card Today control was removed.
- Completing a reading preserves the current scroll position.
- Enlarged and evenly spaced the four note-type tabs.
- Saved note cards can be swiped left to reveal a two-press Delete control.
