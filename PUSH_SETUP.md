# Enable true podcast push notifications

The static PWA can receive background pushes, but a server must detect the new episode and send them. This repo now includes that server in `push-worker/`.

Deploy it once, then paste the Worker URL into **Settings → Notifications → Podcast push service** inside the app.

See `push-worker/README.md` for the complete setup.

For production, after the Worker is deployed, put its URL in `push-config.js`. Then every user sees the configured push service automatically; the Settings URL field remains available as a per-device override for testing.
