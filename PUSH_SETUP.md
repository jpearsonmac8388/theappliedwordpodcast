# Enable true new-episode push notifications

The PWA now detects new episodes from The Applied Word's RSS feed:

`https://anchor.fm/s/11003f2bc/podcast/rss`

No Spotify login, Spotify Developer app, or feed setup is required for listeners. The RSS URL and Spotify show URL are already built into the push Worker.

A small push server is still required because a closed PWA cannot poll the feed by itself. This repo includes that server in `push-worker/`.

Deploy the Worker once for the app. Then put the deployed Worker URL in `push-config.js` before publishing the app. After that, listeners only see one control: **Turn On** / **Turn Off** for new episode alerts.

See `push-worker/README.md` for deployment steps.
