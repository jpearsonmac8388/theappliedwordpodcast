// Replaces the old Netlify wildcard redirect for /spurgeon/*.
// Same reasoning as functions/berean/[file].js — CCEL doesn't send CORS
// headers either, so this fetches the reading server-side and returns it
// from the app's own origin.

export async function onRequestGet({ params }) {
  const path = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  if (!path) return new Response("Not found", { status: 404 });

  try {
    const upstream = await fetch("https://ccel.org/ccel/spurgeon/" + path);
    if (!upstream.ok) {
      return new Response("Upstream error: " + upstream.status, { status: 502 });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") || "text/html; charset=utf-8",
        "cache-control": "public, max-age=604800"
      }
    });
  } catch (err) {
    return new Response("Proxy fetch failed", { status: 502 });
  }
}
