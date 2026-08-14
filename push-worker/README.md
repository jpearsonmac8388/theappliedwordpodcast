# The Applied Word Podcast — True New-Episode Push Service

This Worker turns the app's podcast alert into true background Web Push.

It does four jobs:

1. Uses Spotify's **Client Credentials** flow on the server.
2. Checks show `75QaXUSGooCOG8oqKhuNmG` every five minutes for the newest episode.
3. Stores browser PushSubscriptions in Cloudflare KV.
4. When the newest Spotify episode ID changes, sends a Web Push notification to every subscribed device — even when the installed PWA is closed.

The first scheduled check only records the current latest episode so existing subscribers are not blasted during setup. Every later episode-ID change triggers a push.

## Deploy

You need a free/paid Cloudflare account and a Spotify Developer app.

### 1. Install dependencies

```bash
cd push-worker
npm install
```

### 2. Create a KV namespace

```bash
npx wrangler kv namespace create SUBSCRIPTIONS
```

Copy the returned namespace ID into `wrangler.toml` in place of `REPLACE_WITH_KV_NAMESPACE_ID`.

### 3. Create VAPID keys

```bash
npm run generate-vapid
```

Copy the two values printed by the script. Store them as Worker secrets:

```bash
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
```

The private key must never go into the PWA or GitHub Pages files.

### 4. Add Spotify credentials

Create a Spotify Developer app with Web API access, then add its credentials as Worker secrets:

```bash
npx wrangler secret put SPOTIFY_CLIENT_ID
npx wrangler secret put SPOTIFY_CLIENT_SECRET
```

### 5. Add an admin key

This protects the optional manual `/check` endpoint:

```bash
npx wrangler secret put ADMIN_KEY
```

### 6. Set the VAPID subject and optional app origin

Edit `wrangler.toml`:

```toml
VAPID_SUBJECT = "mailto:you@example.com"
APP_ORIGIN = "https://YOUR-GITHUB-USERNAME.github.io"
```

If your project is at a repository subpath, `APP_ORIGIN` is still only the origin, not the path.

### 7. Deploy

```bash
npm run deploy
```

Wrangler will print a URL similar to:

```text
https://the-applied-word-push.YOUR-SUBDOMAIN.workers.dev
```

Open the PWA → **Settings → Notifications → Podcast push service**, paste that URL, tap **Save URL**, then **Connect**.

On iPhone/iPad, Web Push requires the site to be installed as a Home Screen web app. Notification permission must also be granted by the user.

## Testing

Run locally with scheduled-handler testing enabled:

```bash
npm run dev
```

Trigger the scheduled check with Wrangler's scheduled test route. You can also call `/check` with your admin key:

```bash
curl -X POST \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  https://YOUR-WORKER.workers.dev/check
```

`GET /latest` returns the newest Spotify episode that the app displays in the Podcast tab.

## Reading-plan push reminders

When the PWA is connected to this Worker, its M’Cheyne reading reminder settings are synchronized to the subscription. The same five-minute Cron Trigger can therefore send the daily reading reminder while the app is closed. If the push backend is not connected, the PWA falls back to its local in-app reminder checker.
