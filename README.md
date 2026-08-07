# The Applied Word — web app

Everything here is finished and ready to go live. No build step, no command
line required for the simple path.

---

## Put it online

This repo is set up two ways at once. Pick based on whether you need the
live Bible download and Spurgeon reading to work.

### Option A — GitHub Pages (static only)

1. Push this repo to GitHub.
2. Repo → **Settings → Pages → Source → GitHub Actions**.
3. Push to `main`. The included workflow (`.github/workflows/deploy.yml`)
   builds and deploys automatically — check the **Actions** tab for the URL.

This works for everything except two things: the **BSB/BLB/BRB download**
in Settings, and **Spurgeon's Morning and Evening**. Both need a small
server-side proxy to fetch from another site (see below) — GitHub Pages is
pure static file hosting and can't run one. Everything else — devotions,
the M'Cheyne plan, verse cards, the podcast page, and reading any
already-downloaded Bible text — works exactly the same.

### Option B — Cloudflare Pages (everything, including live fetch)

1. Push this repo to GitHub.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages →
   Connect to Git**, pick this repo.
3. Build settings: framework preset **None**, build command **empty**,
   output directory **`/`**. Deploy.

Cloudflare Pages reads the same repo and *also* runs the two files in
`functions/` as real server-side functions — no separate service, no
extra sign-up beyond the free Cloudflare account. This is the option that
matches everything the app was built to do, so it's the one to use unless
you specifically don't need the Bible download or Spurgeon.

Your own domain works the same way on either platform: add it in Settings
→ Domains and point your DNS at it.

---

## It installs like a real app

Once it's on a live HTTPS address, men can put it on their home screen — full
screen, own icon, no browser bars, works with no signal.

- **iPhone:** open in Safari → Share button → Add to Home Screen
- **Android:** Chrome shows an install banner on its own

This is why we skipped the App Store for now. No $99/year Apple fee, no $25
Google fee, no review queue, and you can change a word and have it live in a
minute. If the app takes off, the same code wraps into real store apps later.

---

## Change the devotions

Open **`content.js`** in any text editor — TextEdit, Notepad, whatever.

There are 28 devotions in there now: 21 written for a 52-week topical plan
(Identity, then Discipline, then Prayer — the rest of the year still needs
writing) plus the original 7, kept and moved to the end rather than deleted.
The list is in day order — entry 1 is day 1 of the year, entry 2 is day 2,
and so on — and the app loops back to the top once it runs out. Add more
weeks by pasting new blocks in wherever they belong in the sequence; nothing
else needs to change. Copy a whole block from `{` to `},`, paste it where you
want it, and rewrite the words.

Each one has six parts:

| Field | What it is |
|---|---|
| `title` | Two lines. The second line prints in orange. |
| `verse` | The scripture text. |
| `ref` | Book, chapter, verse. |
| `body` | The devotion. Wrap a phrase in `**stars**` to bold it. |
| `carry` | The one line a man remembers at 2pm. `<br>` breaks the line. |
| `walk` | The single action for today. |

**After any edit:** open `sw.js`, bump `applied-word-v6` to `v7` (then v8,
v9…). That tells phones a new version exists. Then push to `main`.

---

## What's in the box

```
index.html                     the whole app
content.js                     devotions + Bible text  ← the file you edit
manifest.webmanifest           makes it installable
sw.js                          makes it work offline
icons/                         app icon, built from your artwork
functions/berean/[file].js     Cloudflare Pages proxy for the Bible tiers
functions/spurgeon/[[path]].js Cloudflare Pages proxy for CCEL
.github/workflows/deploy.yml   GitHub Pages auto-deploy
README.md                      this file
```

---

## The Bible page

A real reading app. Chapters laid out to read, tap any verse to highlight it
in one of five colours, attach a note, copy it, or turn it into a shareable
card. Bookmark a chapter to keep your place. Everything you mark collects on
the **Margin** tab.

The text is the Berean Bible — placed in the public domain in April 2023, so
there's no key, no fee, and no licence to renew.

### Getting the text onto a phone

Open **Settings → Bible library** and tap **Download** on a tier. The app
fetches the real translation, parses it into chapters and verses, and stores it
on the device. No file to find, nothing to upload.

| Tier | Source | Status |
|---|---|---|
| **Study** — Berean Standard Bible (BSB) | bereanbible.com | Complete, 66 books |
| **Literal** — Berean Literal Bible (BLB) | literalbible.com | NT complete, OT draft |
| **Reader's** — Berean Reader's Bible (BRB) | readersbible.com | Paragraph layout |
| **Interlinear** (BIB) | — | No plain-text edition exists |
| **Emphasized** (BEB) | — | Not released yet |

The last two have no Download button on purpose. Bible Hub publishes the
Interlinear as PDF and Word only — each word carries six separate fields, so
there's no text file anywhere to read. The Emphasized tier is still being built
by its publisher. Rather than give you buttons that break, the app says so.

### Why this needs a proxy function

Browsers block a page from fetching another site's files directly unless that
site opts in with CORS headers — Bible Hub and CCEL's servers don't. The two
files in `functions/` run on Cloudflare's edge and do that fetch server-side,
so the browser only ever talks to your own domain and the block never
applies. It's the same trick the old Netlify setup used; this is the
GitHub/Cloudflare version of it.

**One consequence:** the Download button and Spurgeon both need the
Cloudflare Pages deploy (Option B above) to work. On plain GitHub Pages, or
opening `index.html` straight off your computer, there's no proxy to hit and
both will say so rather than hanging.

## Reading plans

The full 365-day M'Cheyne calendar, transcribed from Robert Murray M'Cheyne's
own 1842 original. Four readings a day — two for the family, two "secret" (his
word, from Matthew 6:6). Tap one to open it in the reader, or tick it off.
February 29 has no readings, because his calendar never had a 366th day; the
app says so rather than inventing one.

## Verse cards

Tap a verse → **Make card** → pick 9:16 for Reels and Stories or 3:4 for a feed
post. Both render at full 1080-wide Instagram resolution in the app's own
colours. On a phone, Save opens the share sheet so it can go straight to Photos.

## The podcast page

Pulls straight from your Spotify show:

```
https://open.spotify.com/show/75QaXUSGooCOG8oqKhuNmG
```

New episodes appear on their own when you publish. Nothing to update here.
If you ever move hosts, that URL is the only line to change — it's at the top
of the `<script>` block in `index.html`.
