# The Applied Word Podcast — New Episode Push Service

This Cloudflare Worker provides true background Web Push for the installed PWA.

It:

1. Checks the built-in Anchor/Spotify for Creators RSS feed every five minutes.
2. Reads the newest RSS `<item>` and stores its GUID in Cloudflare KV.
3. Detects a new episode when the GUID changes.
4. Sends Web Push to subscribed devices, including when the installed PWA is closed.
5. Also sends configured M'Cheyne reading-plan reminders.

The podcast feed and Spotify listening URL are already configured in `wrangler.toml`. Listeners never enter either URL and do not need a Spotify account to enable notifications.

## One-time deployment

### 1. Install dependencies

```bash
cd push-worker
npm install
```

### 2. Create the KV namespace

```bash
npx wrangler kv namespace create SUBSCRIPTIONS
```

Paste the returned namespace ID into `wrangler.toml`.

### 3. Generate VAPID keys

```bash
npm run generate-vapid
```

Store the keys as Worker secrets:

```bash
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
```

### 4. Optional admin key

```bash
npx wrangler secret put ADMIN_KEY
```

### 5. Configure your app origin

Set `APP_ORIGIN` and `VAPID_SUBJECT` in `wrangler.toml`.

### 6. Deploy

```bash
npm run deploy
```

Wrangler prints a URL similar to:

`https://the-applied-word-push.YOUR-SUBDOMAIN.workers.dev`

Paste that URL once into the root app file `push-config.js`:

```js
window.TAW_PUSH_SERVICE_URL = "https://the-applied-word-push.YOUR-SUBDOMAIN.workers.dev";
```

Commit and publish the app. From then on, listeners only tap **Turn On** for episode alerts.

## Detection behavior

The first scheduled check records the current newest RSS item without notifying everyone. Later GUID changes trigger a push. Notification taps open the Spotify show.

`GET /latest` exposes the newest episode metadata to the Podcast tab.
