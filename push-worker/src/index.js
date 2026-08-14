import { sendNotification } from "web-push-neo";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extra } });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const configured = String(env.APP_ORIGIN || "").trim().replace(/\/$/, "");
  const allow = configured ? (origin === configured ? origin : configured) : (origin || "*");
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Admin-Key",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function originAllowed(request, env) {
  const configured = String(env.APP_ORIGIN || "").trim().replace(/\/$/, "");
  if (!configured) return true;
  const origin = (request.headers.get("Origin") || "").replace(/\/$/, "");
  return !origin || origin === configured;
}

async function subscriptionKey(endpoint) {
  const bytes = new TextEncoder().encode(endpoint);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hex = [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sub:${hex}`;
}

function normalizeSubscriptionRecord(value){
  if (!value) return null;
  if (value.subscription && value.subscription.endpoint) {
    return { subscription:value.subscription, preferences:value.preferences||{}, lastReadingKey:value.lastReadingKey||"" };
  }
  if (value.endpoint) return { subscription:value, preferences:{}, lastReadingKey:"" };
  return null;
}
function dateIndex(startDate,currentDate){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate||"") || !/^\d{4}-\d{2}-\d{2}$/.test(currentDate||"")) return null;
  const a=Date.parse(startDate+"T12:00:00Z"), b=Date.parse(currentDate+"T12:00:00Z");
  return Math.round((b-a)/86400000);
}
function localParts(now,timeZone){
  try{
    const f=new Intl.DateTimeFormat("en-CA",{timeZone:timeZone||"UTC",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});
    const out={}; f.formatToParts(now).forEach((p)=>{out[p.type]=p.value;});
    return {date:`${out.year}-${out.month}-${out.day}`,minutes:(+out.hour)*60+(+out.minute)};
  }catch{
    return {date:now.toISOString().slice(0,10),minutes:now.getUTCHours()*60+now.getUTCMinutes()};
  }
}
function minutesOf(time){ const p=String(time||"07:00").split(":"); return (+p[0]||0)*60+(+p[1]||0); }

async function getSpotifyToken(env) {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    throw new Error("Spotify client credentials are not configured");
  }
  const basic = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  if (!response.ok) throw new Error(`Spotify token request failed (${response.status})`);
  const data = await response.json();
  return data.access_token;
}

async function getLatestEpisode(env) {
  const token = await getSpotifyToken(env);
  const showId = env.SPOTIFY_SHOW_ID || "75QaXUSGooCOG8oqKhuNmG";
  const response = await fetch(`https://api.spotify.com/v1/shows/${encodeURIComponent(showId)}/episodes?market=US&limit=1&offset=0`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Spotify episodes request failed (${response.status}): ${body.slice(0, 180)}`);
  }
  const data = await response.json();
  const ep = data.items && data.items[0];
  if (!ep) throw new Error("Spotify returned no episodes for this show");
  return {
    id: ep.id,
    name: ep.name,
    description: ep.description || "",
    release_date: ep.release_date || "",
    release_date_precision: ep.release_date_precision || "day",
    duration_ms: ep.duration_ms || 0,
    url: ep.external_urls && ep.external_urls.spotify ? ep.external_urls.spotify : `https://open.spotify.com/episode/${ep.id}`
  };
}

async function sendEpisodePush(subscription, episode, env) {
  const payload = JSON.stringify({
    title: "New Applied Word episode",
    body: episode.name,
    url: episode.url,
    tag: `episode-${episode.id}`.slice(0, 64),
    type: "podcast",
    episodeId: episode.id
  });
  return sendNotification(subscription, payload, {
    vapidDetails: {
      subject: env.VAPID_SUBJECT || "mailto:admin@example.com",
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY
    },
    TTL: 86400,
    urgency: "high",
    topic: "applied-word-episode"
  });
}

async function fanOutEpisode(episode, env) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) throw new Error("VAPID keys are not configured");
  let cursor;
  let sent = 0;
  let removed = 0;
  do {
    const page = await env.SUBSCRIPTIONS.list({ prefix: "sub:", cursor });
    cursor = page.list_complete ? undefined : page.cursor;
    for (const key of page.keys) {
      const stored = await env.SUBSCRIPTIONS.get(key.name, "json");
      const record = normalizeSubscriptionRecord(stored);
      if (!record || !record.subscription || !record.subscription.endpoint) continue;
      try {
        await sendEpisodePush(record.subscription, episode, env);
        sent++;
      } catch (err) {
        const code = err && (err.statusCode || err.status);
        if (code === 404 || code === 410) {
          await env.SUBSCRIPTIONS.delete(key.name);
          removed++;
        } else {
          console.error("Push failed", code || "unknown", err && err.message ? err.message : err);
        }
      }
    }
  } while (cursor);
  return { sent, removed };
}

async function sendReadingPush(subscription, env){
  const payload=JSON.stringify({
    title:"Reading plan reminder",
    body:"Today’s M’Cheyne readings are ready.",
    url:"./?tab=devotion&plan=1",
    tag:"mcheyne-reading",
    type:"plan"
  });
  return sendNotification(subscription,payload,{
    vapidDetails:{subject:env.VAPID_SUBJECT||"mailto:admin@example.com",publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY},
    TTL:43200,urgency:"normal",topic:"mcheyne-reading"
  });
}

async function sendDueReadingReminders(env){
  if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY) return {sent:0,removed:0};
  let cursor, sent=0, removed=0;
  const now=new Date();
  do{
    const page=await env.SUBSCRIPTIONS.list({prefix:"sub:",cursor});
    cursor=page.list_complete?undefined:page.cursor;
    for(const key of page.keys){
      const stored=await env.SUBSCRIPTIONS.get(key.name,"json");
      const record=normalizeSubscriptionRecord(stored); if(!record) continue;
      const pref=record.preferences&&record.preferences.readingReminder;
      if(!pref||!pref.enabled) continue;
      const local=localParts(now,pref.timezone||"UTC"), idx=dateIndex(pref.startDate,local.date);
      if(idx===null||idx<0||idx>=365||local.minutes<minutesOf(pref.time)||record.lastReadingKey===local.date) continue;
      try{
        await sendReadingPush(record.subscription,env); sent++;
        record.lastReadingKey=local.date;
        await env.SUBSCRIPTIONS.put(key.name,JSON.stringify(record));
      }catch(err){
        const code=err&&(err.statusCode||err.status);
        if(code===404||code===410){ await env.SUBSCRIPTIONS.delete(key.name); removed++; }
        else console.error("Reading push failed",code||"unknown",err&&err.message?err.message:err);
      }
    }
  }while(cursor);
  return {sent,removed};
}

async function checkForNewEpisode(env, { notify = true } = {}) {
  const episode = await getLatestEpisode(env);
  const previous = await env.SUBSCRIPTIONS.get("meta:latestEpisode", "json");

  if (!previous || !previous.id) {
    await env.SUBSCRIPTIONS.put("meta:latestEpisode", JSON.stringify(episode));
    return { initialized: true, changed: false, episode, sent: 0, removed: 0 };
  }

  if (previous.id === episode.id) {
    await env.SUBSCRIPTIONS.put("meta:latestEpisode", JSON.stringify(episode));
    return { initialized: false, changed: false, episode, sent: 0, removed: 0 };
  }

  await env.SUBSCRIPTIONS.put("meta:latestEpisode", JSON.stringify(episode));
  const result = notify ? await fanOutEpisode(episode, env) : { sent: 0, removed: 0 };
  return { initialized: false, changed: true, episode, ...result };
}

async function handleFetch(request, env) {
  const cors = corsHeaders(request, env);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (!originAllowed(request, env)) return json({ ok: false, error: "Origin not allowed" }, 403, cors);

  const url = new URL(request.url);

  if (url.pathname === "/config" && request.method === "GET") {
    return json({
      ok: true,
      publicKey: env.VAPID_PUBLIC_KEY || "",
      spotifyConfigured: !!(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET),
      showId: env.SPOTIFY_SHOW_ID || "75QaXUSGooCOG8oqKhuNmG"
    }, 200, cors);
  }

  if (url.pathname === "/latest" && request.method === "GET") {
    try {
      const episode = await getLatestEpisode(env);
      return json({ ok: true, episode }, 200, { ...cors, "Cache-Control": "public, max-age=120" });
    } catch (err) {
      return json({ ok: false, error: err.message || String(err) }, 502, cors);
    }
  }

  if (url.pathname === "/subscribe" && request.method === "POST") {
    const body = await request.json();
    const sub = body && body.subscription ? body.subscription : body;
    const preferences = body && body.subscription ? (body.preferences||{}) : {};
    if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      return json({ ok: false, error: "Invalid PushSubscription" }, 400, cors);
    }
    const key = await subscriptionKey(sub.endpoint);
    const existing=normalizeSubscriptionRecord(await env.SUBSCRIPTIONS.get(key,"json"));
    await env.SUBSCRIPTIONS.put(key, JSON.stringify({subscription:sub,preferences,lastReadingKey:existing?existing.lastReadingKey:""}));
    return json({ ok: true }, 200, cors);
  }

  if (url.pathname === "/preferences" && request.method === "POST") {
    const body=await request.json().catch(()=>({}));
    if(!body.endpoint) return json({ok:false,error:"Missing endpoint"},400,cors);
    const key=await subscriptionKey(body.endpoint);
    const record=normalizeSubscriptionRecord(await env.SUBSCRIPTIONS.get(key,"json"));
    if(!record) return json({ok:false,error:"Subscription not found"},404,cors);
    record.preferences=body.preferences||{};
    await env.SUBSCRIPTIONS.put(key,JSON.stringify(record));
    return json({ok:true},200,cors);
  }

  if (url.pathname === "/unsubscribe" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (!body.endpoint) return json({ ok: false, error: "Missing endpoint" }, 400, cors);
    await env.SUBSCRIPTIONS.delete(await subscriptionKey(body.endpoint));
    return json({ ok: true }, 200, cors);
  }

  if (url.pathname === "/check" && request.method === "POST") {
    if (!env.ADMIN_KEY || request.headers.get("X-Admin-Key") !== env.ADMIN_KEY) {
      return json({ ok: false, error: "Unauthorized" }, 401, cors);
    }
    try {
      const result = await checkForNewEpisode(env, { notify: true });
      return json({ ok: true, ...result }, 200, cors);
    } catch (err) {
      return json({ ok: false, error: err.message || String(err) }, 500, cors);
    }
  }

  return json({
    ok: true,
    service: "The Applied Word Podcast push service",
    endpoints: ["GET /config", "GET /latest", "POST /subscribe", "POST /preferences", "POST /unsubscribe"]
  }, 200, cors);
}

export default {
  fetch: handleFetch,
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(Promise.all([
      checkForNewEpisode(env,{notify:true}),
      sendDueReadingReminders(env)
    ]).then(([episodeResult,readingResult])=>{
      console.log("Episode check",JSON.stringify(episodeResult));
      console.log("Reading reminders",JSON.stringify(readingResult));
    }).catch((err)=>console.error("Scheduled push job failed",err)));
  }
};
