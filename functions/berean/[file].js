// Replaces the old Netlify redirects for /berean/*.txt.
// Runs server-side on Cloudflare's edge, so it isn't subject to the
// same-origin restriction a browser fetch would hit — Bible Hub's servers
// don't send CORS headers, so the browser can never fetch them directly.
// This function fetches on the server and hands the result back from the
// app's own origin, exactly like the Netlify proxy did.

const UPSTREAM = {
  "bsb.txt": "https://bereanbible.com/bsb.txt",
  "blb.txt": "https://literalbible.com/blb.txt",
  "brb.txt": "https://readersbible.com/brb.txt"
};

export async function onRequestGet({ params }) {
  const target = UPSTREAM[params.file];
  if (!target) return new Response("Not found", { status: 404 });

  try {
    const upstream = await fetch(target);
    if (!upstream.ok) {
      return new Response("Upstream error: " + upstream.status, { status: 502 });
    }
    const headers = {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400"
    };
    const len = upstream.headers.get("content-length");
    if (len) headers["content-length"] = len;
    return new Response(upstream.body, { status: 200, headers });
  } catch (err) {
    return new Response("Proxy fetch failed", { status: 502 });
  }
}
