/* ============================================================
   THE APPLIED WORD PODCAST — app
   ============================================================ */

var SHOW_URL  = "https://open.spotify.com/show/75QaXUSGooCOG8oqKhuNmG";
var EMBED_URL = "https://open.spotify.com/embed/show/75QaXUSGooCOG8oqKhuNmG?utm_source=generator&theme=0";
var THEMES = [
  {id:"classic", name:"Classic", meta:"Leather & gold"},
  {id:"midnight", name:"Blue Midnight", meta:"Deep navy minimal"},
  {id:"slate", name:"Slate", meta:"Cool graphite slate"},
  {id:"forest", name:"Evergreen", meta:"Pacific Northwest green"},
  {id:"graphite", name:"Graphite", meta:"Neutral black & steel"},
  {id:"sandstone", name:"Sandstone", meta:"Warm light neutral"}
];
var HERO_IMAGES = [
  "assets/hero-armor-belt.jpg",
  "assets/hero-armor-breastplate.jpg",
  "assets/hero-armor-feet.jpg",
  "assets/hero-armor-shield.jpg",
  "assets/hero-armor-helmet.jpg",
  "assets/hero-armor-sword.jpg"
];
var HERO_META = [
  { title:"BELT OF TRUTH", ref:"Ephesians 6:14" },
  { title:"BREASTPLATE OF RIGHTEOUSNESS", ref:"Ephesians 6:14" },
  { title:"FEET OF PEACE", ref:"Ephesians 6:15" },
  { title:"SHIELD OF FAITH", ref:"Ephesians 6:16" },
  { title:"HELMET OF SALVATION", ref:"Ephesians 6:17" },
  { title:"SWORD OF THE SPIRIT", ref:"Ephesians 6:17" }
];
var heroTimer = null;
var heroPreloads = HERO_IMAGES.map(function(src){ var im=new Image(); im.decoding="async"; im.src=src; return im; });
var cardLogo = new Image();
cardLogo.src = "assets/verse-card-logo-round.png";
cardLogo.onload = function(){ if(state.tab==="card") drawCard(); };

/* ---------- small helpers ---------- */
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
function bold(s){ return esc(s).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"); }
function pad(n){ return String(n).length < 2 ? "0"+n : String(n); }
function today(){ return new Date(); }
function dayOfYear(d){ return Math.floor((d - new Date(d.getFullYear(),0,0)) / 86400000); }
function stampOf(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function $(id){ return document.getElementById(id); }
function snip(s,n){
  s=String(s||"").trim();
  if(s.length<=n) return s;
  var out=s.slice(0,n), cut=out.lastIndexOf(" ");
  out=(cut>n*0.6?out.slice(0,cut):out).replace(/[ ,;:.!?-]+$/,"");
  return out+"…";
}
function screenHead(title,subtitle){
  return '<div class="screen-head"><div class="screen-title">'+esc(title)+'</div>'+
    (subtitle?'<div class="screen-subtitle">'+esc(subtitle)+'</div>':'')+'</div>';
}
function getTheme(){
  var id=state.theme || ls("theme") || "classic";
  return THEMES.find(function(t){ return t.id===id; }) || THEMES[0];
}
function applyTheme(){
  var id=(state && state.theme) || ls("theme") || "classic";
  document.body.setAttribute("data-theme", id);
  var meta=document.querySelector('meta[name="theme-color"]');
  var colors={classic:'#1B1510', midnight:'#0d1726', slate:'#18212b', forest:'#10221c', graphite:'#14171b', sandstone:'#ebe2d2'};
  if(meta) meta.setAttribute('content', colors[id] || colors.classic);
}
function baseHeroIndex(){ return (dayOfYear(today())-1) % HERO_IMAGES.length; }
function currentHeroIndex(){
  if(state.heroIndex<0 || state.heroIndex>=HERO_IMAGES.length) state.heroIndex=baseHeroIndex();
  return state.heroIndex;
}
function heroImagePath(){ return HERO_IMAGES[currentHeroIndex()]; }
function setHeroIndex(i, silent){
  state.heroIndex=(i+HERO_IMAGES.length)%HERO_IMAGES.length;
  ls('heroIndex', String(state.heroIndex));
  var img=$('devHeroImg'), next=heroPreloads[state.heroIndex];
  var swap=function(){
    if(!img) return;
    img.classList.remove('swap');
    img.src=HERO_IMAGES[state.heroIndex];
    if(!silent){ void img.offsetWidth; img.classList.add('swap'); }
  };
  if(next && next.complete) swap();
  else if(next) next.onload=swap;
  [].forEach.call(document.querySelectorAll('.hero-dot'), function(dot,ix){ dot.classList.toggle('on', ix===state.heroIndex); });
  var meta=HERO_META[state.heroIndex] || null;
  var titleEl=$("heroTitle"), refEl=$("heroRef");
  if(meta){ if(titleEl) titleEl.textContent=meta.title; if(refEl) refEl.textContent=meta.ref; }
}
function stopHeroCycle(){ if(heroTimer){ clearInterval(heroTimer); heroTimer=null; } }
function startHeroCycle(){
  stopHeroCycle();
  if(!(state.tab==='devotion' && state.devMode==='today')) return;
  setHeroIndex(currentHeroIndex(), true);
  heroTimer=setInterval(function(){ setHeroIndex(state.heroIndex+1); }, 6500);
}
function selectedVerseList(){
  if(!state.sel) return [];
  var vs=(state.sel.vs&&state.sel.vs.length?state.sel.vs:[state.sel.v]).slice();
  return vs.sort(function(a,b){return a-b;});
}
function rangeRef(b,c,vs){
  vs=(vs||[]).slice().sort(function(a,b){return a-b;});
  if(!vs.length) return refOf(b,c);
  if(vs.length===1) return BOOKS[b]+" "+c+":"+vs[0];
  var consecutive=vs.every(function(v,i){ return i===0 || v===vs[i-1]+1; });
  return BOOKS[b]+" "+c+":"+(consecutive ? vs[0]+"–"+vs[vs.length-1] : vs.join(","));
}
function rangeText(b,c,vs,withNumbers){
  vs=(vs||[]).slice().sort(function(a,b){return a-b;});
  return vs.map(function(v){
    var t=verseText(b,c,v)||"";
    return (withNumbers&&vs.length>1 ? v+" ":"")+t;
  }).join(" ");
}
function rangeOutput(b,c,vs){
  var ref=rangeRef(b,c,vs), abbr=(state.meta[state.version]||{}).abbr||"BSB";
  return '“'+rangeText(b,c,vs,true)+'” — '+ref+' ('+abbr+')';
}

function ls(k,v){
  try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }
  catch(e){ return null; }
}
function jget(k,fb){ try{ return JSON.parse(ls(k)) || fb; }catch(e){ return fb; } }
function jset(k,v){ ls(k, JSON.stringify(v)); }

var toastTimer=null;
function toast(msg){
  var t=$("toast"); t.textContent=msg; t.style.display="block";
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){ t.style.display="none"; },2200);
}

/* ---------- state ---------- */
var state = {
  tab: "devotion",
  // bible
  version: ls("version") || "bsb",
  book: +(ls("book") || 58),      // James
  chapter: +(ls("chapter") || 1),
  bview: "read",                   // read | books | chapters | search
  loaded: {},                      // versionId -> {book:{chap:{v:text}}}
  meta: {},                        // versionId -> meta
  sel: null,                       // {b,c,v}
  listTab: "highlights",
  searchQuery: "",
  fontScale: Math.max(.85, Math.min(1.35, +(ls("fontScale") || 1))),
  // devotion
  devMode: "today",                // today | plan
  spDate: stampOf(new Date()),
  spHalf: "morning",
  spData: null, spState: "idle",
  // plans
  planDate: stampOf(new Date()),
  // history
  historyTab: "activity",
  theme: ls("theme") || "classic",
  heroIndex: +(ls("heroIndex") || -1),
  // card
  cardRatio: "9:16", cardVerse: null,
  // notes
  noteSection: ls("noteSection") || "sermon",
  noteId: null,
  notePreview: false,
  reminderTarget: null,
  returnTab: "devotion",
  categoryOpen: null
};
try{
  var initialParams=new URLSearchParams(location.search);
  var initialTab=initialParams.get("tab"), initialSection=initialParams.get("section"), initialNote=initialParams.get("note");
  if(["devotion","podcast","bible","notes","history"].indexOf(initialTab)>-1) state.tab=initialTab;
  if(["sermon","prayer","study","men"].indexOf(initialSection)>-1) state.noteSection=initialSection;
  if(initialNote) state.noteId=initialNote;
}catch(e){}

/* ---------- user marks ---------- */
function keyOf(b,c,v){ return b+":"+c+":"+v; }
function marks(){ return jget("marks",{}); }
function markFor(b,c,v){ return marks()[keyOf(b,c,v)] || null; }
function setMark(b,c,v,patch){
  var m=marks(), k=keyOf(b,c,v), cur=m[k]||{};
  Object.keys(patch).forEach(function(p){
    if(patch[p]===null) delete cur[p]; else cur[p]=patch[p];
  });
  if(!cur.hl && !cur.note) delete m[k]; else { cur.at=Date.now(); m[k]=cur; }
  jset("marks",m);
}
function bookmarks(){ return jget("bookmarks",[]); }
function isBookmarked(b,c){
  return bookmarks().some(function(x){ return x.b===b && x.c===c; });
}
function toggleBookmark(b,c){
  var list=bookmarks(), i=-1;
  list.forEach(function(x,ix){ if(x.b===b&&x.c===c) i=ix; });
  if(i>-1){ list.splice(i,1); jset("bookmarks",list); return false; }
  list.unshift({b:b,c:c,at:Date.now()}); jset("bookmarks",list); return true;
}

/* ---------- notes library ---------- */
var NOTE_SECTIONS=[
  {id:"sermon", label:"SERMON NOTES", short:"SERMON", hint:"Capture key points, verses, and takeaways from a sermon.", kind:"document"},
  {id:"prayer", label:"PRAYER REQUESTS", short:"PRAYER", hint:"Keep prayer needs and answers in a simple running list.", kind:"prayer"},
  {id:"study", label:"BIBLE STUDY NOTES", short:"STUDY", hint:"Record observations, cross references, and study thoughts.", kind:"document"},
  {id:"men", label:"MEN’S GROUP NOTES", short:"MEN’S GROUP", hint:"Track discussion points, accountability, and next steps.", kind:"document"}
];
var PRAYER_CATEGORIES=["Family","Personal","Health","Salvation","Guidance","Provision","Relationships","Church","World & Missions","Thanksgiving","Other"];
var REMINDER_FREQS=[
  {id:"once",label:"One time"},
  {id:"daily",label:"Daily"},
  {id:"weekly",label:"Weekly"},
  {id:"monthly",label:"Monthly"}
];
function notificationPrefs(){
  var p=jget("notificationPrefs",{});
  if(typeof p.podcast!=="boolean") p.podcast=false;
  if(typeof p.lastPodcastKey!=="string") p.lastPodcastKey="";
  return p;
}
function saveNotificationPrefs(p){ jset("notificationPrefs",p||{}); }
function cleanReminder(r){
  if(!r || typeof r!=="object") return null;
  var out={
    enabled:r.enabled!==false,
    frequency:["once","daily","weekly","monthly"].indexOf(r.frequency)>-1?r.frequency:"once",
    date:r.date||stampOf(new Date()),
    time:r.time||"07:00",
    weekday:Number.isFinite(+r.weekday)?+r.weekday:new Date().getDay(),
    monthday:Number.isFinite(+r.monthday)?Math.max(1,Math.min(31,+r.monthday)):new Date().getDate(),
    lastFired:r.lastFired||""
  };
  return out;
}
function defaultReminder(){
  var d=new Date(Date.now()+3600000);
  return {enabled:true,frequency:"once",date:stampOf(d),time:pad(d.getHours())+":"+pad(d.getMinutes()),weekday:d.getDay(),monthday:d.getDate(),lastFired:""};
}
function noteSectionById(id){ return NOTE_SECTIONS.find(function(s){return s.id===id;}) || NOTE_SECTIONS[0]; }
function makeId(prefix){ return prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8); }
function normalizeNoteLibrary(lib){
  lib=lib&&typeof lib==="object"?lib:{};
  if(!lib.docs) lib.docs={};
  ["sermon","study","men"].forEach(function(k){
    if(!Array.isArray(lib.docs[k])) lib.docs[k]=[];
    lib.docs[k].forEach(function(n){ if(n.reminder) n.reminder=cleanReminder(n.reminder); });
  });
  if(!Array.isArray(lib.prayers)) lib.prayers=[];
  lib.prayers.forEach(function(r){
    if(!r.category || PRAYER_CATEGORIES.indexOf(r.category)<0) r.category="Personal";
    r.pinned=!!r.pinned;
    if(r.reminder) r.reminder=cleanReminder(r.reminder);
  });
  return lib;
}
function noteLibrary(){
  var lib=jget("noteLibrary",null);
  if(lib) return normalizeNoteLibrary(lib);
  lib=normalizeNoteLibrary({});
  var legacy=jget("sectionNotes",{}), now=Date.now();
  ["sermon","study","men"].forEach(function(k){
    var body=typeof legacy[k]==="string"?legacy[k].trim():"";
    if(body) lib.docs[k].push({id:makeId("note"),title:"Imported note",body:body,created:now,updated:now});
  });
  var prayer=typeof legacy.prayer==="string"?legacy.prayer.trim():"";
  if(prayer) lib.prayers.push({id:makeId("prayer"),text:prayer,answered:false,created:now,updated:now});
  jset("noteLibrary",lib);
  return lib;
}
function saveNoteLibrary(lib){ jset("noteLibrary",normalizeNoteLibrary(lib)); }
function docsFor(section){ var lib=noteLibrary(); return (lib.docs[section]||[]).slice().sort(function(a,b){return (b.updated||0)-(a.updated||0);}); }
function findDoc(section,id){ return docsFor(section).find(function(n){return n.id===id;}) || null; }
function createDoc(section){
  var lib=noteLibrary(), now=Date.now(), doc={id:makeId("note"),title:"",body:"",created:now,updated:now};
  lib.docs[section].unshift(doc); saveNoteLibrary(lib); return doc;
}
function saveDoc(section,id,title,body){
  var lib=noteLibrary(), list=lib.docs[section]||[], doc=list.find(function(n){return n.id===id;});
  if(!doc) return null;
  doc.title=String(title||"").trim(); doc.body=String(body||""); doc.updated=Date.now();
  saveNoteLibrary(lib); return doc;
}
function deleteDoc(section,id){
  var lib=noteLibrary(); lib.docs[section]=(lib.docs[section]||[]).filter(function(n){return n.id!==id;}); saveNoteLibrary(lib);
}
function prayerRequests(){
  return noteLibrary().prayers.slice().sort(function(a,b){
    if(!!a.answered!==!!b.answered) return a.answered?1:-1;
    if(!!a.pinned!==!!b.pinned) return a.pinned?-1:1;
    return (b.updated||b.created||0)-(a.updated||a.created||0);
  });
}
function createPrayer(){
  var lib=noteLibrary(), now=Date.now(), item={id:makeId("prayer"),text:"",answered:false,category:"Personal",pinned:false,reminder:null,created:now,updated:now};
  lib.prayers.unshift(item); saveNoteLibrary(lib); return item;
}
function savePrayer(id,textVal){
  var lib=noteLibrary(), item=lib.prayers.find(function(x){return x.id===id;}); if(!item) return;
  item.text=String(textVal||""); item.updated=Date.now(); saveNoteLibrary(lib);
}
function togglePrayer(id){
  var lib=noteLibrary(), item=lib.prayers.find(function(x){return x.id===id;}); if(!item) return;
  item.answered=!item.answered; item.updated=Date.now(); saveNoteLibrary(lib);
}
function deletePrayer(id){ var lib=noteLibrary(); lib.prayers=lib.prayers.filter(function(x){return x.id!==id;}); saveNoteLibrary(lib); }
function setPrayerCategory(id,category){
  var lib=noteLibrary(), item=lib.prayers.find(function(x){return x.id===id;}); if(!item) return;
  item.category=PRAYER_CATEGORIES.indexOf(category)>-1?category:"Other"; item.updated=Date.now(); saveNoteLibrary(lib);
}
function togglePrayerPin(id){
  var lib=noteLibrary(), item=lib.prayers.find(function(x){return x.id===id;}); if(!item) return false;
  item.pinned=!item.pinned; item.updated=Date.now(); saveNoteLibrary(lib); return item.pinned;
}
function findPrayer(id){ return noteLibrary().prayers.find(function(x){return x.id===id;}) || null; }
function setItemReminder(target,reminder){
  var lib=noteLibrary();
  if(!target) return;
  if(target.type==="prayer"){
    var pr=lib.prayers.find(function(x){return x.id===target.id;}); if(!pr) return;
    pr.reminder=reminder?cleanReminder(reminder):null; pr.updated=Date.now();
  } else if(target.type==="note"){
    var list=lib.docs[target.section]||[], doc=list.find(function(x){return x.id===target.id;}); if(!doc) return;
    doc.reminder=reminder?cleanReminder(reminder):null; doc.updated=Date.now();
  }
  saveNoteLibrary(lib);
}
function reminderForTarget(target){
  if(!target) return null;
  if(target.type==="prayer"){ var p=findPrayer(target.id); return p&&p.reminder?cleanReminder(p.reminder):null; }
  var d=findDoc(target.section,target.id); return d&&d.reminder?cleanReminder(d.reminder):null;
}
function reminderSummary(r){
  r=cleanReminder(r); if(!r) return "No reminder";
  var time=r.time||"07:00", parts=time.split(":"), h=+parts[0], m=parts[1]||"00", ampm=h>=12?"PM":"AM", hh=h%12||12;
  var clock=hh+":"+m+" "+ampm;
  if(r.frequency==="daily") return "Daily · "+clock;
  if(r.frequency==="weekly") return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][r.weekday]+" · "+clock;
  if(r.frequency==="monthly") return "Monthly · day "+r.monthday+" · "+clock;
  var d=r.date?new Date(r.date+"T12:00:00"):new Date();
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" · "+clock;
}

function timeMinutes(t){ var p=String(t||"00:00").split(":"), h=+p[0]||0,m=+p[1]||0; return h*60+m; }
function dateKeyLocal(d){ return stampOf(d); }
function reminderOccursToday(r,d){
  r=cleanReminder(r); if(!r||r.enabled===false) return false;
  if(r.frequency==="daily") return true;
  if(r.frequency==="weekly") return d.getDay()===r.weekday;
  if(r.frequency==="monthly") return d.getDate()===r.monthday;
  return r.date===dateKeyLocal(d);
}
function reminderDueKey(r,now){
  r=cleanReminder(r); if(!r||r.enabled===false) return null;
  if(r.frequency==="once"){
    var due=new Date(r.date+"T"+(r.time||"07:00")+":00");
    var onceKey="once:"+r.date+":"+r.time;
    return now>=due && r.lastFired!==onceKey ? onceKey : null;
  }
  if(!reminderOccursToday(r,now)) return null;
  var minutes=now.getHours()*60+now.getMinutes();
  if(minutes<timeMinutes(r.time)) return null;
  var key=r.frequency+":"+dateKeyLocal(now);
  return r.lastFired===key?null:key;
}
function prayersForToday(){
  var now=new Date();
  return prayerRequests().filter(function(r){
    return !r.answered && (r.pinned || (r.reminder && reminderOccursToday(r.reminder,now)));
  });
}
function updateReminderLastFired(target,key){
  var lib=noteLibrary();
  if(target.type==="prayer"){
    var pr=lib.prayers.find(function(x){return x.id===target.id;});
    if(pr&&pr.reminder) pr.reminder.lastFired=key;
  }else{
    var list=lib.docs[target.section]||[], doc=list.find(function(x){return x.id===target.id;});
    if(doc&&doc.reminder) doc.reminder.lastFired=key;
  }
  saveNoteLibrary(lib);
}
function canNotify(){ return typeof Notification!=="undefined"; }
function notificationStatus(){
  if(!canNotify()) return "unsupported";
  return Notification.permission || "default";
}
function ensureNotificationPermission(){
  if(!canNotify()) return Promise.resolve("unsupported");
  if(Notification.permission!=="default") return Promise.resolve(Notification.permission);
  return Notification.requestPermission();
}
function showAppNotification(title,body,data){
  if(!canNotify() || Notification.permission!=="granted") return Promise.resolve(false);
  var opts={body:body||"",icon:"icons/icon-192.png",badge:"icons/favicon.png",tag:(data&&data.tag)||("taw-"+Date.now()),data:data||{}};
  if("serviceWorker" in navigator){
    return navigator.serviceWorker.ready.then(function(reg){ return reg.showNotification(title,opts).then(function(){return true;}); }).catch(function(){return false;});
  }
  try{ new Notification(title,opts); return Promise.resolve(true); }catch(e){ return Promise.resolve(false); }
}
function fireReminderTarget(target,item,key){
  var title,body,url;
  if(target.type==="prayer"){
    title="Prayer reminder";
    body=(item.category?item.category+": ":"")+snip(item.text||"Prayer request",120);
    url="./?tab=notes&section=prayer";
  }else{
    title="Note reminder";
    body=(item.title||"Untitled note")+" · "+noteSectionById(target.section).label;
    url="./?tab=notes&section="+encodeURIComponent(target.section)+"&note="+encodeURIComponent(target.id);
  }
  return showAppNotification(title,body,{tag:"reminder-"+target.id,url:url,type:"reminder"}).then(function(shown){
    if(!shown) toast(title+": "+body);
    updateReminderLastFired(target,key);
    return shown;
  });
}
function checkLocalReminders(){
  var now=new Date(), lib=noteLibrary();
  ["sermon","study","men"].forEach(function(section){
    (lib.docs[section]||[]).forEach(function(doc){
      if(!doc.reminder) return;
      var key=reminderDueKey(doc.reminder,now);
      if(key) fireReminderTarget({type:"note",section:section,id:doc.id},doc,key);
    });
  });
  (lib.prayers||[]).forEach(function(pr){
    if(pr.answered||!pr.reminder) return;
    var key=reminderDueKey(pr.reminder,now);
    if(key) fireReminderTarget({type:"prayer",id:pr.id},pr,key);
  });
  checkPodcastReleaseReminder(now);
}
function pacificParts(d){
  try{
    var f=new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",weekday:"short",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});
    var parts=f.formatToParts(d), out={}; parts.forEach(function(p){out[p.type]=p.value;}); return out;
  }catch(e){ return null; }
}
function podcastReleaseKey(now){
  var p=pacificParts(now); if(!p) return null;
  var days={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}, dow=days[p.weekday];
  if(dow===undefined) return null;
  var mins=(+p.hour)*60+(+p.minute);
  if(dow===1 && mins<360) return null;
  var back=(dow+6)%7;
  var d=new Date(Date.UTC(+p.year,+p.month-1,+p.day));
  d.setUTCDate(d.getUTCDate()-back);
  return d.getUTCFullYear()+"-"+pad(d.getUTCMonth()+1)+"-"+pad(d.getUTCDate());
}
function checkPodcastReleaseReminder(now){
  var prefs=notificationPrefs(); if(!prefs.podcast) return;
  var key=podcastReleaseKey(now||new Date());
  if(!key||prefs.lastPodcastKey===key) return;
  prefs.lastPodcastKey=key; saveNotificationPrefs(prefs);
  showAppNotification("New episode day","The Applied Word Podcast releases Mondays at 6:00 AM Pacific. Open Spotify to listen.",{tag:"podcast-"+key,url:SHOW_URL,type:"podcast"}).then(function(shown){
    if(!shown) toast("New episode day · Open the Podcast tab to listen");
  });
}

function updateReminderFormVisibility(){
  var f=$("reminderFreq"), panel=document.querySelector(".reminder-panel"); if(!f||!panel) return;
  panel.setAttribute("data-frequency",f.value);
}
function saveReminderFromPanel(){
  var target=state.reminderTarget; if(!target) return;
  var freq=$("reminderFreq"), time=$("reminderTime"), date=$("reminderDate"), weekday=$("reminderWeekday"), monthday=$("reminderMonthday");
  var r=reminderForTarget(target)||defaultReminder();
  r.frequency=freq?freq.value:"once";
  r.time=time&&time.value?time.value:"07:00";
  r.date=date&&date.value?date.value:stampOf(new Date());
  r.weekday=weekday?+weekday.value:new Date().getDay();
  r.monthday=monthday?Math.max(1,Math.min(31,+monthday.value||1)):new Date().getDate();
  r.enabled=true; r.lastFired="";
  setItemReminder(target,r);
  state.reminderTarget=null;
  ensureNotificationPermission().then(function(){ toast("Reminder saved"); render(); checkLocalReminders(); });
}
function noteStats(){
  var lib=noteLibrary(), docs=0, chars=0;
  ["sermon","study","men"].forEach(function(k){ docs+=(lib.docs[k]||[]).length; (lib.docs[k]||[]).forEach(function(n){chars+=(n.title||"").length+(n.body||"").length;}); });
  lib.prayers.forEach(function(r){chars+=(r.text||"").length;});
  return {docs:docs,prayers:lib.prayers.length,chars:chars};
}
function notePreviewText(body){ return snip(String(body||"").replace(/[#*_>`\[\]-]/g," ").replace(/\s+/g," ").trim(),150); }
function renderMarkdown(src){
  var md=esc(String(src||"").replace(/\r/g,""));
  if(!md.trim()) return '<p class="md-empty">Nothing here yet. Start writing in the editor.</p>';
  md=md.replace(/^### (.*)$/gm,'<h3>$1</h3>')
       .replace(/^## (.*)$/gm,'<h2>$1</h2>')
       .replace(/^# (.*)$/gm,'<h1>$1</h1>')
       .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
       .replace(/\*(.+?)\*/g,'<em>$1</em>')
       .replace(/`([^`]+)`/g,'<code>$1</code>');
  var lines=md.split('\n'), out=[], inUl=false, inOl=false;
  function closeLists(){if(inUl){out.push('</ul>');inUl=false;}if(inOl){out.push('</ol>');inOl=false;}}
  lines.forEach(function(line){
    if(/^\s*$/.test(line)){closeLists();return;}
    var m;
    if((m=line.match(/^\- \[ \] (.*)$/))){if(inOl){out.push('</ol>');inOl=false;}if(!inUl){out.push('<ul class="md-check">');inUl=true;}out.push('<li><span class="box"></span><span>'+m[1]+'</span></li>');return;}
    if((m=line.match(/^\- \[x\] (.*)$/i))){if(inOl){out.push('</ol>');inOl=false;}if(!inUl){out.push('<ul class="md-check">');inUl=true;}out.push('<li><span class="box checked">✓</span><span>'+m[1]+'</span></li>');return;}
    if((m=line.match(/^\- (.*)$/))){if(inOl){out.push('</ol>');inOl=false;}if(!inUl){out.push('<ul>');inUl=true;}out.push('<li>'+m[1]+'</li>');return;}
    if((m=line.match(/^\d+\. (.*)$/))){if(inUl){out.push('</ul>');inUl=false;}if(!inOl){out.push('<ol>');inOl=true;}out.push('<li>'+m[1]+'</li>');return;}
    closeLists();
    if((m=line.match(/^&gt;\s?(.*)$/))){out.push('<blockquote>'+m[1]+'</blockquote>');return;}
    out.push('<p>'+line+'</p>');
  });
  closeLists(); return out.join('');
}
function noteButtonLabel(){ return state.notePreview ? "EDIT" : "PREVIEW"; }
function saveOpenNote(){
  if(!state.noteId || state.noteSection==="prayer") return;
  var current=findDoc(state.noteSection,state.noteId); if(!current) return;
  var title=$("noteTitle"), body=$("notesEditor");
  saveDoc(state.noteSection,state.noteId,title?title.value:current.title,body?body.value:current.body);
}
function applyMarkdownAction(action){
  var ta=$("notesEditor"); if(!ta) return;
  var start=ta.selectionStart||0,end=ta.selectionEnd||0,val=ta.value||"",sel=val.slice(start,end),rep="";
  switch(action){
    case "bold":rep="**"+(sel||"bold text")+"**";break;
    case "italic":rep="*"+(sel||"italic text")+"*";break;
    case "h2":rep="## "+(sel||"Section title");break;
    case "bullet":rep="- "+(sel||"List item");break;
    case "check":rep="- [ ] "+(sel||"Checklist item");break;
    case "quote":rep="> "+(sel||"Quoted note");break;
    case "verse":rep="**Scripture:** "+(sel||"Book 1:1");break;
    default:return;
  }
  ta.setRangeText(rep,start,end,"end"); saveOpenNote(); ta.focus();
}

/* ---------- verse bookmarks + categories ---------- */
function verseBookmarks(){ return jget("verseBookmarks",[]); }
function verseKey(b,c,v){ return b+":"+c+":"+v; }
function isVerseBookmarked(b,c,v){
  var key=verseKey(b,c,v);
  return verseBookmarks().indexOf(key)>-1;
}
function toggleVerseBookmarks(b,c,vs){
  var list=verseBookmarks(), keys=(vs||[]).map(function(v){return verseKey(b,c,v);}), added=0, removed=0;
  var allSaved=keys.length && keys.every(function(k){return list.indexOf(k)>-1;});
  if(allSaved){
    keys.forEach(function(k){ var at=list.indexOf(k); if(at>-1){ list.splice(at,1); removed++; } });
  } else {
    keys.forEach(function(k){ if(list.indexOf(k)<0){ list.push(k); added++; } });
  }
  jset("verseBookmarks",list);
  return {added:added,removed:removed};
}
function categories(){ return jget("verseCategories",[]); }
function saveCategories(list){ jset("verseCategories",list||[]); }
function newCategoryId(){ return "cat-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7); }
function createCategory(name){
  name=String(name||"").trim();
  if(!name) return null;
  var list=categories();
  var existing=list.find(function(c){ return c.name.toLowerCase()===name.toLowerCase(); });
  if(existing) return existing;
  var cat={id:newCategoryId(),name:name,verses:[],createdAt:Date.now()};
  list.push(cat); saveCategories(list); return cat;
}
function categoryById(id){ return categories().find(function(c){ return c.id===id; }) || null; }
function addSelectionToCategory(id,b,c,vs){
  var list=categories(), cat=list.find(function(x){return x.id===id;});
  if(!cat) return 0;
  cat.verses=cat.verses||[];
  var added=0;
  (vs||[]).forEach(function(v){ var k=verseKey(b,c,v); if(cat.verses.indexOf(k)<0){ cat.verses.push(k); added++; } });
  saveCategories(list); return added;
}
function removeVerseFromCategory(id,key){
  var list=categories(), cat=list.find(function(x){return x.id===id;});
  if(!cat) return;
  cat.verses=(cat.verses||[]).filter(function(k){ return k!==key; }); saveCategories(list);
}
function deleteCategory(id){ saveCategories(categories().filter(function(c){return c.id!==id;})); }
function renameCategory(id,name){
  name=String(name||"").trim(); if(!name) return;
  var list=categories(), cat=list.find(function(c){return c.id===id;}); if(!cat) return;
  cat.name=name; saveCategories(list);
}
function categoryNamesForVerse(b,c,v){
  var key=verseKey(b,c,v);
  return categories().filter(function(cat){return (cat.verses||[]).indexOf(key)>-1;}).map(function(cat){return cat.name;});
}
function categoryChipHTML(b,c,v){
  var names=categoryNamesForVerse(b,c,v);
  if(!names.length && !isVerseBookmarked(b,c,v)) return '';
  return '<div class="verse-tags">'+(isVerseBookmarked(b,c,v)?'<span class="verse-tag bookmark">★</span>':'')+
    names.slice(0,2).map(function(n){return '<span class="verse-tag">'+esc(n)+'</span>';}).join('')+
    (names.length>2?'<span class="verse-tag">+'+(names.length-2)+'</span>':'')+'</div>';
}
function selectionCount(){ return selectedVerseList().length; }
function clearVerseSelection(){ state.sel=null; render(); }
function toggleVerseSelection(v){
  var b=state.book,c=state.chapter;
  if(!state.sel || state.sel.b!==b || state.sel.c!==c){ state.sel={b:b,c:c,v:v,vs:[v],anchor:v}; render(); return; }
  var vs=selectedVerseList(), at=vs.indexOf(v);
  if(at>-1) vs.splice(at,1); else vs.push(v);
  vs.sort(function(a,b){return a-b;});
  if(!vs.length){ state.sel=null; render(); return; }
  state.sel.v=vs[0]; state.sel.vs=vs; render();
}
function selectionActionBar(){
  if(!state.sel || state.sel.b!==state.book || state.sel.c!==state.chapter) return '';
  var n=selectionCount();
  return '<div class="verse-selection-bar">'+
    '<div class="selection-summary"><b>'+n+(n===1?' VERSE':' VERSES')+'</b><span>'+esc(rangeRef(state.book,state.chapter,selectedVerseList()))+'</span><button data-selclear="1" aria-label="Clear verse selection">×</button></div>'+
    '<div class="selection-actions">'+
      '<button data-selact="highlight"><span>▰</span>HIGHLIGHT</button>'+
      '<button data-selact="copy"><span>⧉</span>COPY</button>'+
      '<button data-selact="card"><span>□</span>CARD</button>'+
      '<button data-selact="bookmark"><span>★</span>BOOKMARK</button>'+
      '<button data-selact="category"><span>⊕</span>CATEGORY</button>'+
      '<button data-selact="note"><span>✎</span>NOTE</button>'+
    '</div></div>';
}
function openCategoryPicker(){
  if(!state.sel) return;
  var overlay=$("categoryOverlay"), listEl=$("categoryList"), input=$("categoryName");
  if(!overlay||!listEl||!input) return;
  var cats=categories();
  listEl.innerHTML=cats.length ? cats.map(function(cat){
    return '<button class="category-pick" data-categoryapply="'+cat.id+'"><b>'+esc(cat.name)+'</b><span>'+(cat.verses||[]).length+' saved verse'+((cat.verses||[]).length===1?'':'s')+'</span></button>';
  }).join('') : '<div class="category-empty">No categories yet. Create one below.</div>';
  input.value=''; overlay.hidden=false; input.focus();
}
function closeCategoryPicker(){ var o=$("categoryOverlay"); if(o) o.hidden=true; }
function categoryView(){
  var cats=categories(), open=state.categoryOpen ? categoryById(state.categoryOpen) : null;
  if(open){
    var rows=(open.verses||[]).map(function(key){
      var p=key.split(":"),b=+p[0],c=+p[1],v=+p[2],tx=verseText(b,c,v);
      return '<div class="category-verse-row"><button data-jumpverse="'+b+':'+c+':'+v+'"><b>'+esc(refOf(b,c,v))+'</b><span>'+esc(tx||'Verse text available when this translation is installed.')+'</span></button><button class="category-remove" data-catremove="'+open.id+'|'+key+'" aria-label="Remove from category">×</button></div>';
    }).join('');
    return '<div class="pad categories-page"><button class="backlink" data-catback="1">‹ ALL CATEGORIES</button>'+screenHead(open.name,(open.verses||[]).length+' saved verses')+
      '<div class="category-toolbar"><button class="mini" data-catrename="'+open.id+'">RENAME</button><button class="mini danger" data-catdelete="'+open.id+'">DELETE</button></div>'+
      '<div class="category-verses">'+(rows||emptyBox("EMPTY CATEGORY","Select verses in the Bible reader and add them to this category."))+'</div></div>';
  }
  return '<div class="pad categories-page"><button class="backlink" data-bview="read">‹ BACK TO READER</button>'+screenHead("Verse Categories","Group verses into named collections")+
    '<div class="category-create-row"><input id="categoryLibraryName" maxlength="60" placeholder="New category name"><button data-catcreate="1">CREATE</button></div>'+ 
    '<div class="category-grid">'+(cats.length?cats.map(function(cat){return '<button class="category-card" data-catopen="'+cat.id+'"><span class="category-icon">⊕</span><b>'+esc(cat.name)+'</b><small>'+(cat.verses||[]).length+' VERSES</small></button>';}).join(''):emptyBox("NO CATEGORIES YET","Create a category, then select verses and add them to it."))+'</div></div>';
}

/* ---------- streak ---------- */
function getStreak(){ return parseInt(ls("streak")||"0",10); }
function walkedToday(){ return ls("lastWalk")===stampOf(today()); }
function markWalk(){
  var last=ls("lastWalk"), t=stampOf(today());
  if(last===t) return;
  var y=stampOf(new Date(Date.now()-86400000));
  ls("streak", String(last===y ? getStreak()+1 : 1));
  ls("lastWalk", t);
  logActivity("walk","Today","The Walk completed");
}


/* ---------- activity history ---------- */
function activity(){ return jget("activity",[]); }
function logActivity(type, ref, detail){
  var list=activity(), now=Date.now(), last=list[0];
  if(last && last.type===type && last.ref===ref && now-last.at<15000) return;
  list.unshift({type:type,ref:ref||"",detail:detail||"",at:now});
  if(list.length>250) list=list.slice(0,250);
  jset("activity",list);
}
function recordChapterRead(b,c){
  logActivity("read", BOOKS[b]+" "+c, "Bible reading");
}
function activityIcon(type){
  return {walk:"✦",read:"▤",highlight:"●",note:"✎",share:"↗",card:"□",
    bookmark:"★",category:"⊕",podcast:"▶",download:"⇩",plan:"✓"}[type] || "•";
}
function activityLabel(type){
  return {walk:"Devotional completed",read:"Read Scripture",highlight:"Highlighted verse",
    note:"Added a note",share:"Shared a verse",card:"Created a verse card",
    bookmark:"Bookmarked Scripture",category:"Added verse category",podcast:"Opened podcast",download:"Downloaded Bible",
    plan:"Completed plan reading"}[type] || "Activity";
}

/* ---------- bible access ---------- */
function verseText(b,c,v){
  var d=state.loaded[state.version];
  return d && d[b] && d[b][c] ? d[b][c][v] : null;
}
function chapterVerses(b,c){
  var d=state.loaded[state.version];
  if(!d || !d[b] || !d[b][c]) return null;
  var obj=d[b][c];
  return Object.keys(obj).map(Number).sort(function(x,y){return x-y;})
    .map(function(n){ return [n, obj[n]]; });
}
function refOf(b,c,v){
  return BOOKS[b]+" "+c+(v?":"+v:"");
}
function currentTier(){
  var t=null; TIERS.forEach(function(x){ if(x.id===state.version) t=x; }); return t;
}
function installedTiers(){ return TIERS.filter(function(t){ return !!state.meta[t.id]; }); }
function versionSelectHTML(){
  var list=installedTiers();
  return '<div class="translation-row"><label for="versionSelect">TRANSLATION</label><select id="versionSelect">'+list.map(function(t){ return '<option value="'+t.id+'"'+(t.id===state.version?' selected':'')+'>'+esc(t.abbr)+' · '+esc(t.name)+'</option>'; }).join('')+'</select><button data-go="settings">MANAGE</button></div>';
}

function loadVersion(id){
  if(state.loaded[id]) return Promise.resolve(state.loaded[id]);
  return store.get("bible:"+id).then(function(d){
    if(d) state.loaded[id]=d;
    return d;
  });
}
function refreshMeta(){
  return Promise.all(TIERS.filter(function(t){return t.available;}).map(function(t){
    return store.get("meta:"+t.id).then(function(m){ if(m) state.meta[t.id]=m; else delete state.meta[t.id]; });
  }));
}
function anyInstalled(){ return Object.keys(state.meta).length>0; }

/* ============================================================
   DEVOTION
   ============================================================ */
function devotionView(){
  if(state.devMode==="plan") return plansView();

  var d=today(), n=dayOfYear(d);
  var dev=DEVOTIONS[(n-1) % DEVOTIONS.length];
  var done=walkedToday();
  var title=dev.title[0]+" "+dev.title[1];
  var dateLine=d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
  var heroIx=currentHeroIndex();
  var heroMeta=HERO_META[heroIx] || {title:"ARMOR OF GOD", ref:"Ephesians 6"};

  return '<div class="pad home-page">'+
    screenHead("Today", dateLine)+
    '<div class="tabsel devotion-tabs devotion-switch">'+
      '<button class="'+(state.devMode==="today"?"on":"")+'" data-dev="today">TODAY</button>'+
      '<button class="'+(state.devMode==="plan"?"on":"")+'" data-dev="plan">READING PLAN</button>'+
    '</div>'+
    '<div class="feature-card devotion-feature">'+
      '<div class="feature-media hero-rotator">'+
        '<img id="devHeroImg" src="'+heroImagePath()+'" alt="Biblical devotional scene">'+
        '<div class="hero-overlay"></div>'+
        '<div class="hero-badge">THE APPLIED WORD PODCAST</div>'+
        '<div class="hero-caption"><div id="heroTitle" class="hero-title">'+esc(heroMeta.title)+'</div><div id="heroRef" class="hero-ref">'+esc(heroMeta.ref)+'</div></div>'+
      '</div>'+
      '<div class="feature-content">'+
        '<div class="feature-kicker">DAILY DEVOTIONAL</div>'+
        '<div class="feature-title">'+esc(title)+'</div>'+
        '<div class="feature-refline">'+esc(dev.ref)+' · BSB</div>'+
        '<div class="feature-text">'+esc(snip(dev.verse,170))+'</div>'+
        '<div class="hero-dots">'+HERO_IMAGES.map(function(_,ix){ return '<span class="hero-dot'+(ix===heroIx?' on':'')+'"></span>'; }).join('')+'</div>'+
      '</div>'+
    '</div>'+
    '<div class="quick-grid">'+
      '<button class="quick-card" data-openref="'+esc(dev.ref)+'">'+
        '<span class="quick-ico">▤</span><span><b>Read the chapter</b><small>'+esc(dev.ref)+'</small></span></button>'+
      '<button class="quick-card" data-cardref="'+esc(dev.ref)+'">'+
        '<span class="quick-ico">□</span><span><b>Create verse image</b><small>Share to social</small></span></button>'+
    '</div>'+
    '<div class="content-card scripture-card">'+
      '<div class="content-kicker">TODAY&#39;S WORD</div>'+
      '<p class="verse">'+esc(dev.verse)+'</p>'+
      '<div class="ref" style="margin-top:14px">'+esc(dev.ref)+' · BSB</div>'+
    '</div>'+
    '<div class="content-card study-card"><div class="content-kicker">DEVOTIONAL</div>'+
      '<div class="body" style="margin-top:14px">'+
      dev.body.map(function(p){ return "<p>"+bold(p)+"</p>"; }).join("")+'</div></div>'+
    '<div class="carry modern-carry"><div class="tag">CARRY THIS</div><div class="line">'+dev.carry+'</div></div>'+
    '<div class="walk modern-walk"><h3>THE WALK</h3><p>'+esc(dev.walk)+'</p>'+
      (done
        ? '<div class="stamped"><div class="seal">&#10022; WALKED IT · DAY '+n+' &#10022;</div>'+
          '<div class="sub">'+getStreak()+'-DAY STREAK</div></div>'
        : '<button class="stamp-btn" id="walkBtn">MARK THE WALK DONE</button>')+
    '</div>'+
    '<div class="foot">THE APPLIED WORD PODCAST</div></div>';
}

function spurgeonView(){
  var parts=state.spDate.split("-");
  var mo=+parts[1], dy=+parts[2];

  var body;
  if(state.spState==="loading"){
    body='<div class="loading"><i></i>OPENING SPURGEON</div>';
  } else if(state.spState==="error"){
    body='<div class="empty"><h4>COULDN\'T LOAD SPURGEON</h4>'+
      '<p>The app could not download or open the Morning and Evening reading. '+
      'Check your connection and try again. Once the public-domain collection loads successfully, '+
      'it is saved on this device for offline reading.</p>'+
      '<button class="cta" style="max-width:260px;margin:16px auto 0" data-spretry="1">TRY AGAIN</button>'+
      '<a class="cta ghost" style="max-width:260px;margin:10px auto 0" target="_blank" rel="noopener" href="'+
        SPURGEON.sourceUrl(mo,dy,state.spHalf)+'">OPEN IT ON CCEL</a></div>';
  } else if(state.spData){
    var s=state.spData;
    body='<div class="bracket" style="margin-top:20px"><p class="verse">'+esc(s.verse)+'</p>'+
      (s.ref?'<div class="ref" style="margin-top:14px">'+esc(s.ref)+'</div>':'')+'</div>'+
      '<div class="body" style="margin-top:22px">'+
        s.paras.map(function(p){ return "<p>"+esc(p)+"</p>"; }).join("")+'</div>'+
      (s.verse ? '<button class="cta ghost" data-spcard="1">MAKE A VERSE CARD</button>' : '')+
      '<div class="foot">C. H. SPURGEON · MORNING AND EVENING · PUBLIC DOMAIN</div>';
  } else {
    body='<div class="loading"><i></i>PICK A DATE</div>';
  }

  return '<div class="pad">'+
    '<div class="eyebrow">Morning and Evening</div>'+
    '<h1 style="font-size:33px">SPURGEON</h1><div class="rule" style="margin-bottom:6px"></div>'+

    '<div class="tabsel devotion-tabs">'+
      '<button data-dev="today">TODAY</button>'+
      '<button data-dev="plan">READING PLAN</button>'+
      '<button class="on" data-dev="spurgeon">SPURGEON</button>'+
    '</div>'+

    '<div class="planbar">'+
      '<input type="date" id="spDate" value="'+state.spDate+'">'+
    '</div>'+
    '<div class="tabsel" style="margin-top:9px">'+
      '<button class="'+(state.spHalf==="morning"?"on":"")+'" data-half="morning">MORNING</button>'+
      '<button class="'+(state.spHalf==="evening"?"on":"")+'" data-half="evening">EVENING</button>'+
    '</div>'+

    '<div style="margin-top:6px;font-family:var(--util);font-size:9.5px;letter-spacing:.12em;color:var(--ash)">'+
      new Date(state.spDate+"T12:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric"}).toUpperCase()+
      " · "+state.spHalf.toUpperCase()+'</div>'+

    body+'</div>';
}

var spurgeonDataset=null;
var SPURGEON_STORE_KEY="spurgeon:data:v1";

function fetchSpurgeonDataset(){
  return fetch(SPURGEON.datasetUrl,{cache:"force-cache"})
    .then(function(r){
      if(!r.ok) throw new Error("Spurgeon data HTTP "+r.status);
      return r.json();
    })
    .then(function(data){
      if(!Array.isArray(data) || data.length < 700) throw new Error("Spurgeon data incomplete");
      spurgeonDataset=data;
      // The book is static public-domain content. Cache it once so the
      // devotional continues to work offline and does not redownload.
      if(window.store && store.set) store.set(SPURGEON_STORE_KEY,data).catch(function(){});
      return data;
    });
}

function getSpurgeonDataset(){
  if(spurgeonDataset) return Promise.resolve(spurgeonDataset);

  if(!window.store || !store.get) return fetchSpurgeonDataset();
  return store.get(SPURGEON_STORE_KEY)
    .then(function(cached){
      if(Array.isArray(cached) && cached.length >= 700){
        spurgeonDataset=cached;
        return cached;
      }
      return fetchSpurgeonDataset();
    })
    .catch(function(){ return fetchSpurgeonDataset(); });
}

function normalizeSpurgeonEntry(entry){
  var kv=String(entry && entry.keyverse || "").replace(/\u2009/g," ").replace(/\s+/g," ").trim();
  var verse=kv, ref="";
  var km=kv.match(/^[“"]?(.*?)[”"]?\s+[—–-]\s*(.+?)\.?$/);
  if(km){ verse=km[1].trim(); ref=km[2].trim(); }
  verse=verse.replace(/^[“"]|[”"]$/g,"").trim();

  var raw=String(entry && entry.body || "").replace(/\r/g,"").trim();
  var lines=raw.split("\n");
  // The dataset repeats a date heading and key verse before the actual body.
  if(lines.length && /(?:Morning|Evening) Reading\s*$/i.test(lines[0].trim())) lines.shift();
  while(lines.length && !lines[0].trim()) lines.shift();
  if(lines.length){
    var first=lines[0].replace(/\u2009/g," ").replace(/\s+/g," ").trim().replace(/\.$/,"");
    var key=kv.replace(/\.$/,"");
    if(first===key) lines.shift();
  }
  while(lines.length && !lines[0].trim()) lines.shift();

  var body=lines.join("\n").trim();
  var paras=body.split(/\n\s*\n+/).map(function(p){
    return p.replace(/\s*\n\s*/g," ").replace(/\s+/g," ").trim();
  }).filter(function(p){ return p.length>0; });

  return {verse:verse,ref:ref,paras:paras};
}

function findSpurgeonEntry(data,month,day,half){
  var t=half==="evening" ? "pm" : "am";
  for(var i=0;i<data.length;i++){
    if(+data[i].month===month && +data[i].day===day && data[i].time===t) return data[i];
  }
  return null;
}

function loadSpurgeon(){
  var p=state.spDate.split("-"), mo=+p[1], dy=+p[2], half=state.spHalf;
  state.spState="loading"; state.spData=null; render();

  getSpurgeonDataset()
    .then(function(data){
      var entry=findSpurgeonEntry(data,mo,dy,half);
      if(!entry) throw new Error("reading not found");
      var parsed=normalizeSpurgeonEntry(entry);
      if(!parsed.paras.length) throw new Error("nothing parsed");
      state.spData=parsed; state.spState="ready"; render();
    })
    .catch(function(){
      // Optional compatibility fallback for Cloudflare Pages or another host
      // that serves the legacy /spurgeon proxy function.
      fetch(SPURGEON.page(mo,dy,half))
        .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.text(); })
        .then(function(html){
          var parsed=parseSpurgeon(html);
          if(!parsed.paras.length) throw new Error("nothing parsed");
          state.spData=parsed; state.spState="ready"; render();
        })
        .catch(function(){ state.spState="error"; render(); });
    });
}

/* Pulls the verse, reference and body out of a CCEL reading page. */
function parseSpurgeon(html){
  var doc=new DOMParser().parseFromString(html,"text/html");

  var verse="", ref="";
  var hs=doc.querySelectorAll("h2, h3, h4");
  for(var hi=0;hi<hs.length;hi++){
    var ht=hs[hi].textContent.replace(/\s+/g," ").trim();
    if(/^(?:Morning|Evening),/i.test(ht)) continue;
    if(/^[1-3]?\s*[A-Za-z].*\d+:\d+/.test(ht)){ ref=ht; break; }
  }

  // Current CCEL pages put the key verse immediately before its reference
  // heading. Prefer that text instead of generic <i>/<em> elements in the UI.
  if(ref){
    var refNode=null;
    for(var rhi=0;rhi<hs.length;rhi++){
      if(hs[rhi].textContent.replace(/\s+/g," ").trim()===ref){ refNode=hs[rhi]; break; }
    }
    if(refNode){
      var prev=refNode.previousElementSibling;
      while(prev && !prev.textContent.trim()) prev=prev.previousElementSibling;
      if(prev) verse=prev.textContent.replace(/\s+/g," ").replace(/^[“"']|[”"']$/g,"").trim();
    }
  }

  var paras=[];
  var ps=doc.querySelectorAll("p");
  for(var k=0;k<ps.length;k++){
    var t=ps[k].textContent.replace(/\s+/g," ").trim();
    if(t.length<60) continue;
    if(/please\s+login|VIEWNAME|Christian Classics/i.test(t)) continue;
    if(verse && t.indexOf(verse.slice(0,40))===0) continue;
    paras.push(t);
  }

  // Some CCEL layouts render the devotional as plain text nodes rather than
  // paragraphs. If needed, collect readable blocks after the reference.
  if(!paras.length && ref){
    var root=doc.querySelector("main, article, #content, .workSection") || doc.body;
    var text=root.textContent.replace(/\r/g,"");
    var at=text.indexOf(ref);
    if(at>-1){
      text=text.slice(at+ref.length).replace(/VIEWNAME[\s\S]*$/i,"").trim();
      paras=text.split(/\n\s*\n+/).map(function(x){
        return x.replace(/\s+/g," ").trim();
      }).filter(function(x){ return x.length>60 && !/Go To (?:Morning|Evening) Reading/i.test(x); });
    }
  }
  return { verse:verse, ref:ref, paras:paras };
}

/* ============================================================
   PODCAST
   ============================================================ */
function podcastView(){
  var prefs=notificationPrefs();
  return '<div class="pad podcast-page">'+
    screenHead("Podcast","Listen to the latest weekly devotional")+
    '<div class="podcast-showcase">'+
      '<div class="podcast-art-shell"><img src="assets/podcast-cover.png" alt="The Applied Word Podcast cover" class="podcast-cover large"></div>'+
      '<div class="podcast-meta">'+
        '<div class="content-kicker">THE APPLIED WORD PODCAST</div>'+
        '<div class="podcast-title-lg">Sharpening the man through the Message.</div>'+
        '<p class="muted">Play the show right here, or jump out to Spotify and listen there.</p>'+
      '</div>'+
    '</div>'+
    '<div id="player"><iframe src="'+EMBED_URL+'" title="The Applied Word Podcast on Spotify" loading="lazy" '+
      'allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div>'+
    '<a class="cta spotify-link" href="'+SHOW_URL+'" target="_blank" rel="noopener" data-podact="open">OPEN IN SPOTIFY</a>'+
    '<div class="podcast-alert-card"><div><span class="content-kicker">NEW EPISODE ALERTS</span><b>Monday · 6:00 AM Pacific</b><small>'+(prefs.podcast?'Release reminder enabled':'Release reminder off')+'</small></div><button class="'+(prefs.podcast?'secondary-btn':'primary-btn')+' compact" data-podcastnotify="1">'+(prefs.podcast?'TURN OFF':'ENABLE')+'</button></div>'+
    '<div class="content-card helper-card listen-anywhere square-card"><div class="content-kicker">LISTEN ANYWHERE</div>'+
      '<p class="muted">The Spotify player above displays the show and its newest episodes. The release alert uses the Monday 6:00 AM Pacific schedule.</p></div>'+
    '<div class="foot">THE APPLIED WORD PODCAST · WEEKLY DEVOTIONAL FOR MEN</div></div>';
}

function planDone(){ return jget("plandone",{}); }
function togglePlanReading(dateStr, idx){
  var d=planDone(), k=dateStr;
  if(!d[k]) d[k]=[];
  var at=d[k].indexOf(idx);
  if(at>-1) d[k].splice(at,1); else d[k].push(idx);
  if(!d[k].length) delete d[k];
  jset("plandone",d);
}

function plansView(){
  var p=state.planDate.split("-");
  var mo=+p[1], dy=+p[2];
  var month=MCHEYNE[mo];
  var readings=month && month[dy-1] ? month[dy-1] : null;
  var doneList=planDone()[state.planDate]||[];

  var body;
  if(!readings){
    body='<div class="empty"><h4>A DAY OFF THE CALENDAR</h4>'+
      "<p>M'Cheyne's calendar runs 365 days, so February 29 has no readings of its own. "+
      'Use today to catch up or read ahead.</p></div>';
  } else {
    var mk=function(title, idxs){
      return '<div class="stream content-card"><h4>'+title+'</h4>'+
        idxs.map(function(i){
          var on=doneList.indexOf(i)>-1;
          return '<div class="rd'+(on?" done":"")+'" data-plan="'+i+'">'+
            '<div class="tick">&#10003;</div>'+
            '<div class="rt">'+esc(readings[i])+'</div>'+
            '<button class="mini" data-planopen="'+esc(readings[i])+'" '+
              'style="background:transparent;border:1px solid rgba(228,195,116,.3);color:var(--brass);'+
              'padding:6px 9px;font-size:9px;letter-spacing:.08em">READ</button></div>';
        }).join("")+'</div>';
    };
    body=mk("FAMILY · READ ALOUD",[0,1])+mk("SECRET · ON YOUR OWN",[2,3])+
      '<div class="motto">'+esc(MCHEYNE_MOTTOS[mo])+'</div>'+
      '<div style="margin-top:8px;font-family:var(--util);font-size:9px;letter-spacing:.1em;'+
        'color:rgba(183,154,120,.7)">'+doneList.length+' OF 4 DONE TODAY</div>';
  }

  return '<div class="pad">'+
    screenHead("Reading Plan","M’Cheyne one-year plan")+
    '<div class="tabsel devotion-tabs devotion-switch" style="margin-top:10px">'+
      '<button data-dev="today">TODAY</button>'+
      '<button class="on" data-dev="plan">READING PLAN</button>'+
    '</div>'+
    '<div class="content-card helper-card square-card" style="margin-top:14px"><p class="muted">Robert Murray M’Cheyne wrote this calendar for his church in Dundee in December 1842. Four chapters a day — two to read aloud with the house, two on your own.</p></div>'+
    '<div class="planbar"><input type="date" id="planDate" value="'+state.planDate+'"></div>'+
    body+
    '<div class="foot">PUBLIC DOMAIN · ST. PETER’S, DUNDEE, 1842</div></div>';
}

/* ============================================================
   BIBLE READER
/* ============================================================
   BIBLE READER
   ============================================================ */
function bibleView(){
  if(!anyInstalled()){
    return '<div class="pad bible-library-page">'+
      screenHead("Bible Library","Download any public-domain translation for offline reading")+
      '<div class="library-grid">'+TIERS.filter(function(t){return t.available;}).map(function(t){
        return '<div class="library-card"><div class="library-abbr">'+esc(t.abbr)+'</div><div><h3>'+esc(t.name)+'</h3><p>'+esc(t.note||'')+'</p><small>'+esc(t.license||'Public Domain')+'</small></div><div class="bar" id="bar-'+t.id+'" style="display:none"><i></i></div><button class="cta" data-dl="'+t.id+'">DOWNLOAD '+esc(t.abbr)+'</button></div>';
      }).join('')+'</div><div class="foot">BIBLE TEXT IS STORED LOCALLY AFTER DOWNLOAD</div></div>';
  }

  if(!state.meta[state.version]){
    var first=installedTiers()[0];
    if(first){ state.version=first.id; ls("version",state.version); }
  }
  if(state.bview==="books") return bookPicker();
  if(state.bview==="chapters") return chapterPicker();
  if(state.bview==="search") return bibleSearchView();
  if(state.bview==="categories") return categoryView();

  var verses=chapterVerses(state.book,state.chapter);
  if(!verses){
    return '<div class="pad">'+screenHead("Bible",BOOKS[state.book])+
      versionSelectHTML()+'<div class="loading"><i></i>OPENING '+esc(BOOKS[state.book]).toUpperCase()+'</div></div>';
  }

  var marked=isBookmarked(state.book,state.chapter);
  var selected=selectedVerseList();
  var rows=verses.map(function(pair){
    var v=pair[0], text=pair[1];
    var m=markFor(state.book,state.chapter,v);
    return '<div class="v'+(state.sel&&selected.indexOf(v)>-1?" sel":"")+'"'+
      (m&&m.hl?' data-hl="'+m.hl+'"':'')+' data-v="'+v+'">'+
      '<div class="v-no">'+v+'</div>'+
      '<div class="v-tx"><span class="v-tx-inner">'+esc(text)+'</span>'+categoryChipHTML(state.book,state.chapter,v)+'</div>'+
      (m&&m.note?'<div class="marks"><span title="note">&#9998;</span></div>':'')+
    '</div>';
  }).join("");

  return '<div class="pad bible-page'+(state.sel?' has-selection':'')+'">'+
    screenHead("Bible",(state.meta[state.version]||{}).name||"Bible")+
    versionSelectHTML()+
    '<button class="reader-search-btn" data-bview="search">&#9906; SEARCH BIBLE</button>'+
    readBar()+
    '<div class="reader-tools modern-tools">'+
      '<button data-bview="books" aria-label="Choose book">BOOKS</button>'+
      '<button data-bview="categories" aria-label="Verse categories">CATEGORIES</button>'+
      '<button data-font="-1" aria-label="Decrease text size">A−</button>'+
      '<button data-font="1" aria-label="Increase text size">A+</button>'+
      '<button data-mark="1" aria-label="Bookmark chapter">'+(marked?'★':'☆')+'</button>'+
    '</div>'+
    '<div class="chapter-title">'+esc(BOOKS[state.book])+' '+state.chapter+'</div>'+
    '<div class="chapter-sub">'+esc((state.meta[state.version]||{}).abbr||"")+
      ' · '+verses.length+' VERSES'+(marked?' · CHAPTER BOOKMARKED':'')+'</div>'+
    '<div class="reader-shell"><div class="reader-body" style="--reader-scale:'+state.fontScale+'">'+rows+'</div></div>'+
    '<div class="reader-end"><button class="cta ghost" data-step="1">NEXT CHAPTER &#8250;</button></div>'+
    '<div class="foot">TAP VERSES TO SELECT · THEN HIGHLIGHT, COPY, CARD, BOOKMARK, OR CATEGORIZE</div>'+selectionActionBar()+'</div>';
}

function bibleSearchView(){
  var q=state.searchQuery||"";
  var results=q.trim() ? runBibleSearch(q) : [];
  var rows="";
  if(q.trim() && !results.length){
    rows=emptyBox("NO MATCHES","Try a reference like John 3:16 or a few words from the verse.");
  } else if(results.length){
    rows='<div class="search-count">'+results.length+(results.length===75?"+":"")+' RESULT'+(results.length===1?"":"S")+'</div>'+
      results.map(function(r){
        return '<button class="search-result" data-jumpverse="'+r.b+':'+r.c+':'+r.v+'">'+
          '<span class="item-ref">'+esc(refOf(r.b,r.c,r.v))+'</span>'+
          '<span class="item-tx">'+esc(r.text)+'</span></button>';
      }).join("");
  } else {
    rows='<div class="search-help">Search the entire BSB by reference or words. Examples: <b>John 3:16</b>, <b>fear of the Lord</b>, <b>be strong courageous</b>.</div>';
  }
  return '<div class="pad">'+
    '<button class="backlink" data-bview="read">&#8249; BACK TO READER</button>'+
    screenHead("Search Bible","Find a verse or phrase")+
    '<form class="bible-search" id="bibleSearchForm">'+
      '<input id="bibleSearchInput" type="search" autocomplete="off" spellcheck="false" placeholder="Reference or words" value="'+esc(q)+'">'+
      '<button type="submit">SEARCH</button>'+
    '</form>'+rows+
    '<div class="foot">BEREAN STANDARD BIBLE</div></div>';
}

function runBibleSearch(query){
  var q=String(query||"").trim();
  if(!q) return [];

  var exact=q.match(/^\s*((?:[1-3]\s*)?[A-Za-z][A-Za-z' ]*?)\s+(\d+)(?::(\d+))?\s*$/);
  if(exact){
    var b=resolveBook(exact[1]), c=+exact[2], v=exact[3]?+exact[3]:null;
    if(b!==undefined && c>=1 && c<=CHAPS[b]){
      if(v){
        var tx=verseText(b,c,v);
        return tx?[{b:b,c:c,v:v,text:tx}]:[];
      }
      return chapterVerses(b,c).map(function(x){ return {b:b,c:c,v:x[0],text:x[1]}; });
    }
  }

  var words=q.toLowerCase().split(/\s+/).filter(Boolean), data=state.loaded[state.version]||{}, out=[];
  Object.keys(data).some(function(bk){
    var b=+bk;
    return Object.keys(data[b]||{}).some(function(ck){
      var c=+ck;
      return Object.keys(data[b][c]||{}).some(function(vk){
        var v=+vk, text=data[b][c][v];
        var low=String(text).toLowerCase();
        if(words.every(function(w){ return low.indexOf(w)>-1; })){
          out.push({b:b,c:c,v:v,text:text});
        }
        return out.length>=75;
      }) || out.length>=75;
    }) || out.length>=75;
  });
  return out;
}

function readBar(){
  var lastChap=state.chapter>=CHAPS[state.book];
  var firstChap=state.chapter<=1;
  return '<div class="readbar">'+
    '<button class="nav" data-step="-1"'+(firstChap&&state.book===0?' disabled':'')+'>&#8249;</button>'+
    '<button data-bview="books">'+esc(BOOKS[state.book])+'</button>'+
    '<button data-bview="chapters" style="flex:0 0 68px;text-align:center">CH '+state.chapter+'</button>'+
    '<button class="nav" data-step="1"'+(lastChap&&state.book===65?' disabled':'')+'>&#8250;</button>'+
  '</div>';
}

function stepChapter(dir){
  var b=state.book, c=state.chapter+dir;
  if(c<1){ b=b-1; if(b<0) return; c=CHAPS[b]; }
  if(c>CHAPS[b]){ b=b+1; if(b>65) return; c=1; }
  state.book=b; state.chapter=c; state.sel=null;
  ls("book",b); ls("chapter",c);
  recordChapterRead(b,c);
  render();
}

function bookPicker(){
  var d=state.loaded[state.version]||{};
  var group=function(title,from,to){
    var out='<div class="grouphd">'+title+'</div><div class="bookgrid">';
    for(var i=from;i<=to;i++){
      var has=!!d[i];
      out+='<button data-book="'+i+'"'+(has?'':' disabled style="opacity:.3"')+'>'+esc(BOOKS[i])+'</button>';
    }
    return out+'</div>';
  };
  return '<div class="pad">'+readBar()+
    group("OLD TESTAMENT",0,OT_COUNT-1)+group("NEW TESTAMENT",OT_COUNT,65)+
    '<div class="foot">'+esc((state.meta[state.version]||{}).name||"")+'</div></div>';
}

function chapterPicker(){
  var n=CHAPS[state.book], out='';
  for(var c=1;c<=n;c++) out+='<button data-chap="'+c+'">'+c+'</button>';
  return '<div class="pad">'+readBar()+
    '<div class="grouphd">'+esc(BOOKS[state.book]).toUpperCase()+' · '+n+' CHAPTERS</div>'+
    '<div class="chapgrid">'+out+'</div></div>';
}

/* ---------- verse action sheet ---------- */
function refreshSheetSelection(){
  if(!state.sel) return;
  var vs=selectedVerseList(), b=state.sel.b, c=state.sel.c;
  state.sel.v=vs[0]; state.sel.vs=vs;
  $("sheetRef").textContent=rangeRef(b,c,vs);
  $("sheetText").textContent=rangeText(b,c,vs,true);
  var range=$("sheetRange"); if(range) range.textContent=vs.length+(vs.length===1?" VERSE":" VERSES");
  var first=markFor(b,c,vs[0])||{};
  var note=$("sheetNote");
  if(note && document.activeElement!==note){ note.value=first.note||""; note.placeholder="Note on "+rangeRef(b,c,vs); }
  var common=null, mixed=false;
  vs.forEach(function(v,ix){
    var m=markFor(b,c,v)||{}, h=m.hl||null;
    if(ix===0) common=h; else if(h!==common) mixed=true;
  });
  [].forEach.call(document.querySelectorAll(".sw"),function(s){
    s.classList.toggle("on", !mixed && !!common && s.dataset.c===common);
  });
  var max=(chapterVerses(b,c)||[]).length;
  var prev=$("sheetPrevVerse"), next=$("sheetNextVerse");
  if(prev) prev.disabled=vs[0]<=1;
  if(next) next.disabled=vs[vs.length-1]>=max;
}
function openSheet(v){
  if(!state.sel && v){ state.sel={b:state.book,c:state.chapter,v:v,vs:[v],anchor:v}; }
  if(!state.sel) return;
  $("scrim").style.display="block";
  $("sheet").style.display="block";
  refreshSheetSelection();
  render();
}
function extendSelection(dir){
  if(!state.sel) return;
  var vs=selectedVerseList(), max=(chapterVerses(state.sel.b,state.sel.c)||[]).length;
  var add=dir<0?vs[0]-1:vs[vs.length-1]+1;
  if(add<1||add>max) return;
  vs.push(add); state.sel.vs=vs;
  render(); refreshSheetSelection();
}
function resetSelection(){
  if(!state.sel) return;
  var first=state.sel.anchor||selectedVerseList()[0]; state.sel.v=first; state.sel.vs=[first];
  render(); refreshSheetSelection();
}
function closeSheet(){
  $("sheet").style.display="none";
  $("scrim").style.display="none";
  render();
}

/* ============================================================
   HIGHLIGHTS / NOTES / BOOKMARKS
   ============================================================ */
function listView(){
  var t=state.listTab;
  var rows="";

  if(t==="bookmarks"){
    var bm=bookmarks();
    rows=bm.length ? bm.map(function(x){
      return '<div class="item" data-jump="'+x.b+":"+x.c+'">'+
        '<div class="item-ref">&#9733; '+esc(refOf(x.b,x.c))+'</div></div>';
    }).join("") : "";
    if(!rows) rows=emptyBox("NO BOOKMARKS YET","Open a chapter and tap Bookmark to keep your place.");
  } else {
    var m=marks();
    var keys=Object.keys(m).filter(function(k){
      return t==="highlights" ? !!m[k].hl : !!m[k].note;
    }).sort(function(a,b){ return (m[b].at||0)-(m[a].at||0); });

    rows=keys.map(function(k){
      var p=k.split(":"), b=+p[0], c=+p[1], v=+p[2], e=m[k];
      var text=verseText(b,c,v);
      return '<div class="item" data-jump="'+b+":"+c+'">'+
        '<div class="item-ref">'+
          (e.hl?'<i class="dot" style="background:var(--hl-'+e.hl+')"></i>':'')+
          esc(refOf(b,c,v))+'</div>'+
        (text?'<div class="item-tx">'+esc(text)+'</div>':
              '<div class="item-tx" style="opacity:.5">Download this translation to see the text</div>')+
        (e.note?'<div class="item-note">'+esc(e.note)+'</div>':'')+
      '</div>';
    }).join("");

    if(!rows) rows=emptyBox(
      t==="highlights"?"NOTHING HIGHLIGHTED YET":"NO NOTES YET",
      t==="highlights"?"Tap a verse while reading and pick a colour. Everything you mark collects here."
                      :"Tap a verse, then Note, and write what you saw in it.");
  }

  return '<div class="pad">'+
    '<div class="eyebrow">What you\u2019ve marked</div>'+
    '<h1 style="font-size:34px">THE <em>MARGIN</em></h1><div class="rule" style="margin-bottom:4px"></div>'+
    '<div class="tabsel">'+
      '<button class="'+(t==="highlights"?"on":"")+'" data-list="highlights">HIGHLIGHTS</button>'+
      '<button class="'+(t==="notes"?"on":"")+'" data-list="notes">NOTES</button>'+
      '<button class="'+(t==="bookmarks"?"on":"")+'" data-list="bookmarks">BOOKMARKS</button>'+
    '</div><div style="margin-top:10px">'+rows+'</div></div>';
}
function notesTabsHTML(){
  return '<div class="tabsel notes-tabs">'+NOTE_SECTIONS.map(function(s){
    return '<button class="'+(s.id===state.noteSection?'on':'')+'" data-notesection="'+s.id+'">'+s.short+'</button>';
  }).join('')+'</div>';
}
function noteListView(sec){
  var docs=docsFor(sec.id);
  var rows=docs.length?docs.map(function(n){
    var title=(n.title||'').trim()||'Untitled note';
    var preview=notePreviewText(n.body)||'No note text yet.';
    var d=new Date(n.updated||n.created||Date.now()).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    return '<button class="note-list-card" data-noteopen="'+n.id+'">'+
      '<span class="note-list-top"><b>'+esc(title)+'</b><small>'+esc(d)+'</small></span>'+
      '<span class="note-list-preview">'+esc(preview)+'</span>'+
      '<span class="note-list-meta">'+(n.body||'').length.toLocaleString()+' CHARACTERS'+(n.reminder?' · 🔔 '+esc(reminderSummary(n.reminder)):'')+'</span></button>';
  }).join(''):emptyBox('NO NOTES YET','Create a note and it will appear here with its title and a preview.');
  return '<div class="pad notes-page">'+screenHead('Notes','Saved, titled notes with Markdown support')+
    notesTabsHTML()+
    '<div class="notes-section-head"><div><div class="content-kicker">'+sec.label+'</div><p>'+sec.hint+'</p></div><button class="primary-mini" data-notenew="'+sec.id+'">+ NEW NOTE</button></div>'+
    '<div class="note-list">'+rows+'</div>'+
    '<div class="foot">NOTES SAVE LOCALLY AND ARE INCLUDED IN APP BACKUPS</div></div>';
}
function noteEditorView(sec,doc){
  if(!doc){state.noteId=null;return noteListView(sec);}
  var updated=new Date(doc.updated||doc.created||Date.now()).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  return '<div class="pad notes-page note-editor-page">'+
    '<div class="nested-topbar"><button class="backlink compact-back" data-noteback="1">‹ NOTES</button><span>LAST SAVED '+esc(updated.toUpperCase())+'</span></div>'+
    '<input id="noteTitle" class="note-title-input" type="text" placeholder="Note title" value="'+esc(doc.title||'')+'" autocomplete="off">'+
    '<button class="reminder-strip" data-reminderdoc="'+doc.id+'"><span>🔔</span><span><b>Reminder</b><small>'+esc(doc.reminder?reminderSummary(doc.reminder):'Not set')+'</small></span><span>›</span></button>'+
    '<div class="notes-toolbar compact-toolbar" role="toolbar" aria-label="Markdown formatting">'+
      '<button type="button" data-md="bold" aria-label="Bold" title="Bold"><b>B</b></button>'+
      '<button type="button" data-md="italic" aria-label="Italic" title="Italic"><i>I</i></button>'+
      '<button type="button" data-md="h2" aria-label="Heading" title="Heading">H</button>'+
      '<button type="button" data-md="bullet" aria-label="Bullet list" title="Bullet list">•</button>'+
      '<button type="button" data-md="check" aria-label="Checklist" title="Checklist">☑</button>'+
      '<button type="button" data-md="quote" aria-label="Quote" title="Quote">❝</button>'+
      '<button type="button" data-md="verse" aria-label="Scripture reference" title="Scripture">§</button>'+
    '</div>'+
    (state.notePreview?'<div class="notes-preview markdown-body">'+renderMarkdown(doc.body||'')+'</div>':'<textarea id="notesEditor" class="notes-editor" placeholder="Write your note in Markdown…">'+esc(doc.body||'')+'</textarea>')+
    '<div class="note-editor-actions"><button class="secondary-btn" data-notepreview="1">'+noteButtonLabel()+'</button><button class="secondary-btn danger" data-notedelete="'+doc.id+'">DELETE</button><button class="primary-btn" data-notesave="1">SAVE NOTE</button></div>'+
    '<div class="notes-meta">MARKDOWN SUPPORTED · AUTOSAVED ON THIS DEVICE</div></div>';
}
function prayerTodayFeed(){
  var today=prayersForToday();
  if(!today.length) return '<div class="today-prayer-card empty-today"><div class="content-kicker">TODAY’S PRAYER</div><p>No scheduled or pinned prayer requests for today.</p></div>';
  return '<div class="today-prayer-card"><div class="content-kicker">TODAY’S PRAYER</div><div class="today-prayer-list">'+today.map(function(r){
    return '<div class="today-prayer-row"><span class="prayer-cat-chip">'+esc(r.category||'Personal')+'</span><div><b>'+esc(snip(r.text||'Prayer request',105))+'</b><small>'+(r.pinned?'PINNED · ':'')+(r.reminder?esc(reminderSummary(r.reminder)):'ONGOING')+'</small></div></div>';
  }).join('')+'</div></div>';
}
function prayerNotesView(sec){
  var prayers=prayerRequests();
  var rows=prayers.length?prayers.map(function(r){
    var d=new Date(r.updated||r.created||Date.now()).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    return '<div class="prayer-card'+(r.answered?' answered':'')+(r.pinned?' pinned':'')+'">'+
      '<div class="prayer-card-head"><span>'+(r.pinned?'📌 PINNED · ':'')+esc(d)+'</span><div>'+ 
        '<button class="icon-only-btn" data-prayerpin="'+r.id+'" aria-label="'+(r.pinned?'Unpin':'Pin')+' prayer request" title="'+(r.pinned?'Unpin':'Pin')+'">'+(r.pinned?'★':'☆')+'</button>'+ 
        '<button class="icon-only-btn" data-reminderprayer="'+r.id+'" aria-label="Set reminder" title="Reminder">🔔</button>'+ 
        '<button class="icon-text-btn" data-prayertoggle="'+r.id+'">'+(r.answered?'MARK ACTIVE':'MARK ANSWERED')+'</button>'+ 
        '<button class="icon-only-btn danger" data-prayerdelete="'+r.id+'" aria-label="Delete prayer request">×</button></div></div>'+ 
      '<div class="prayer-meta-row"><label>CATEGORY<select data-prayercategory="'+r.id+'">'+PRAYER_CATEGORIES.map(function(c){return '<option value="'+esc(c)+'"'+(r.category===c?' selected':'')+'>'+esc(c)+'</option>';}).join('')+'</select></label>'+ 
        '<span class="prayer-reminder-chip">'+(r.reminder?'🔔 '+esc(reminderSummary(r.reminder)):'NO REMINDER')+'</span></div>'+ 
      '<textarea class="prayer-text" data-prayertext="'+r.id+'" placeholder="What do you want to pray for?">'+esc(r.text||'')+'</textarea>'+ 
      (r.answered?'<div class="prayer-status">✓ ANSWERED</div>':'')+'</div>';
  }).join(''):emptyBox('NO PRAYER REQUESTS YET','Add a request. Each request can be as long as you need, categorized, pinned, and given a recurring reminder.');
  return '<div class="pad notes-page prayer-page">'+screenHead('Prayer Requests','What do you want to pray for?')+
    notesTabsHTML()+
    '<div class="notes-section-head"><div><div class="content-kicker">'+sec.label+'</div><p>Organize requests, set recurring reminders, and keep today’s prayer focus in one place.</p></div><button class="primary-mini" data-prayernew="1">+ ADD REQUEST</button></div>'+ 
    prayerTodayFeed()+
    '<div class="prayer-list">'+rows+'</div>'+ 
    '<div class="foot">NO CHARACTER LIMIT · REMINDERS · CATEGORIES · INCLUDED IN BACKUPS</div></div>';
}
function reminderOverlayView(){
  var target=state.reminderTarget; if(!target) return '';
  var r=reminderForTarget(target)||defaultReminder();
  var label='Reminder';
  if(target.type==='prayer'){
    var pr=findPrayer(target.id); label=pr&&pr.text?snip(pr.text,60):'Prayer request';
  }else{
    var doc=findDoc(target.section,target.id); label=doc&&doc.title?doc.title:'Untitled note';
  }
  return '<div class="reminder-overlay" data-reminderoverlay="1"><section class="reminder-panel" role="dialog" aria-modal="true" aria-label="Reminder settings">'+
    '<div class="reminder-head"><div><div class="content-kicker">REMINDER</div><h2>'+esc(label)+'</h2></div><button class="icon-only-btn" data-reminderclose="1">×</button></div>'+ 
    '<div class="reminder-form">'+
      '<label>REPEAT<select id="reminderFreq">'+REMINDER_FREQS.map(function(f){return '<option value="'+f.id+'"'+(r.frequency===f.id?' selected':'')+'>'+f.label+'</option>';}).join('')+'</select></label>'+ 
      '<label>TIME<input id="reminderTime" type="time" value="'+esc(r.time)+'"></label>'+ 
      '<label class="rem-once">DATE<input id="reminderDate" type="date" value="'+esc(r.date)+'"></label>'+ 
      '<label class="rem-weekly">DAY<select id="reminderWeekday">'+["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map(function(n,i){return '<option value="'+i+'"'+(r.weekday===i?' selected':'')+'>'+n+'</option>';}).join('')+'</select></label>'+ 
      '<label class="rem-monthly">DAY OF MONTH<input id="reminderMonthday" type="number" min="1" max="31" value="'+r.monthday+'"></label>'+ 
    '</div>'+ 
    '<div class="notification-status-box"><span>NOTIFICATIONS</span><b>'+esc(notificationStatus()==='granted'?'Enabled':notificationStatus()==='denied'?'Blocked':notificationStatus()==='unsupported'?'Not supported':'Permission needed')+'</b><button class="secondary-btn compact" data-notifyenable="1">ENABLE</button></div>'+ 
    '<p class="reminder-help">Reminders are checked while the app is running and again whenever it opens. Background push while the app is fully closed requires a web-push service.</p>'+ 
    '<div class="reminder-actions">'+(reminderForTarget(target)?'<button class="secondary-btn danger" data-reminderremove="1">REMOVE</button>':'')+'<button class="primary-btn" data-remindersave="1">SAVE REMINDER</button></div>'+ 
  '</section></div>';
}
function notesView(){
  var sec=noteSectionById(state.noteSection), html;
  if(sec.kind==='prayer') html=prayerNotesView(sec);
  else if(state.noteId) html=noteEditorView(sec,findDoc(sec.id,state.noteId));
  else html=noteListView(sec);
  return html+reminderOverlayView();
}

function emptyBox(h,p){
  return '<div class="empty"><h4>'+h+'</h4><p>'+p+'</p></div>';
}

/* ============================================================
   HISTORY + SAVED
   ============================================================ */
function historyView(){
  var t=state.historyTab;
  var m=marks(), markedKeys=Object.keys(m);
  var noteN=markedKeys.filter(function(k){return !!m[k].note;}).length;
  var hlN=markedKeys.filter(function(k){return !!m[k].hl;}).length;

  var body=t==="saved" ? savedHistoryRows() : activityRows();
  return '<div class="pad">'+
    screenHead("History","Your reading and app activity")+
    '<div class="history-stats">'+
      '<div><b>'+getStreak()+'</b><span>STREAK</span></div>'+
      '<div><b>'+hlN+'</b><span>HIGHLIGHTS</span></div>'+
      '<div><b>'+noteN+'</b><span>NOTES</span></div>'+
      '<div><b>'+(bookmarks().length+verseBookmarks().length)+'</b><span>BOOKMARKS</span></div>'+
    '</div>'+
    '<div class="tabsel">'+
      '<button class="'+(t==="activity"?"on":"")+'" data-history="activity">ACTIVITY</button>'+
      '<button class="'+(t==="saved"?"on":"")+'" data-history="saved">SAVED</button>'+
    '</div>'+
    '<div class="history-body">'+body+'</div>'+
    (t==="activity" && activity().length ? '<button class="text-action" data-clearhistory="1">CLEAR ACTIVITY HISTORY</button>' : '')+
    '<div class="foot">YOUR NOTES AND MARKS STAY ON THIS DEVICE</div></div>';
}

function activityRows(){
  var rows=activity();
  if(!rows.length) return emptyBox("NO ACTIVITY YET","As you read, highlight, take notes, share verses, and complete devotions, your recent activity will appear here.");
  return '<div class="timeline">'+rows.map(function(a){
    var d=new Date(a.at);
    var when=d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" · "+
      d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    var jump="";
    var m=String(a.ref||"").match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    if(m){
      var b=resolveBook(m[1]);
      if(b!==undefined) jump=' data-jumpverse="'+b+':'+(+m[2])+':'+(m[3]?+m[3]:1)+'"';
    }
    return '<button class="timeline-row"'+jump+'>'+
      '<span class="timeline-icon">'+activityIcon(a.type)+'</span>'+
      '<span class="timeline-copy"><b>'+esc(activityLabel(a.type))+'</b>'+
      (a.ref?'<em>'+esc(a.ref)+'</em>':'')+
      '<small>'+esc(when)+'</small></span></button>';
  }).join("")+'</div>';
}

function savedHistoryRows(){
  var m=marks();
  var keys=Object.keys(m).sort(function(a,b){ return (m[b].at||0)-(m[a].at||0); });
  var saved=[];

  keys.forEach(function(k){
    var p=k.split(":"), b=+p[0], c=+p[1], v=+p[2], e=m[k], text=verseText(b,c,v);
    saved.push('<button class="saved-row" data-jumpverse="'+b+':'+c+':'+v+'">'+
      '<span class="item-ref">'+(e.hl?'<i class="dot" style="background:var(--hl-'+e.hl+')"></i>':'')+
        esc(refOf(b,c,v))+'</span>'+
      (text?'<span class="item-tx">'+esc(text)+'</span>':'')+
      (e.note?'<span class="item-note">'+esc(e.note)+'</span>':'')+
      '</button>');
  });

  bookmarks().forEach(function(x){
    saved.push('<button class="saved-row bookmark-row" data-jumpverse="'+x.b+':'+x.c+':1">'+
      '<span class="item-ref">★ '+esc(refOf(x.b,x.c))+'</span>'+
      '<span class="item-tx">Bookmarked chapter</span></button>');
  });
  verseBookmarks().forEach(function(key){
    var p=key.split(":"), b=+p[0], c=+p[1], v=+p[2], text=verseText(b,c,v);
    saved.push('<button class="saved-row bookmark-row" data-jumpverse="'+b+':'+c+':'+v+'">'+
      '<span class="item-ref">★ '+esc(refOf(b,c,v))+'</span>'+
      (text?'<span class="item-tx">'+esc(text)+'</span>':'<span class="item-tx">Bookmarked verse</span>')+'</button>');
  });

  return saved.length ? saved.join("") :
    emptyBox("NOTHING SAVED YET","Highlights, notes, and chapter bookmarks will collect here.");
}

/* ============================================================
   VERSE CARDS
   ============================================================ */
var RATIOS={ "9:16":[1080,1920], "4:5":[1080,1350], "1:1":[1080,1080] };

function cardView(){
  var cv=state.cardVerse;
  if(!cv){
    return '<div class="pad">'+screenHead("Create Verse Image","Share a highlighted verse")+
      emptyBox("PICK A VERSE FIRST",
        "Tap any verse while reading and choose Card, or use the button on today’s devotion.")+
      '</div>';
  }
  return '<div class="pad card-page">'+
    screenHead("Create Verse Image",cv.ref+' · '+(cv.abbr||"BSB"))+
    '<div class="ratios">'+
      '<button class="'+(state.cardRatio==="9:16"?"on":"")+'" data-ratio="9:16">9:16</button>'+
      '<button class="'+(state.cardRatio==="4:5"?"on":"")+'" data-ratio="4:5">4:5</button>'+
      '<button class="'+(state.cardRatio==="1:1"?"on":"")+'" data-ratio="1:1">1:1</button>'+
    '</div>'+
    '<div class="cardprev light-stage"><canvas id="cardCanvas"></canvas></div>'+
    '<button class="cta" data-savecard="1">SAVE TO PHOTOS</button>'+
    '<p class="muted" style="margin-top:12px;font-size:12.5px">A full-resolution PNG is created for social posting. On iPhone, use the share sheet to save or post it.</p>'+
    '<div class="foot">THE APPLIED WORD PODCAST</div></div>';
}

function drawCard(){
  var cv=state.cardVerse, cvs=$("cardCanvas");
  if(!cv||!cvs) return;
  var dim=RATIOS[state.cardRatio], W=dim[0], H=dim[1];
  cvs.width=W; cvs.height=H;
  var x=cvs.getContext("2d");

  function roundedRect(x0,y0,w,h,r){
    x.beginPath(); x.moveTo(x0+r,y0); x.lineTo(x0+w-r,y0);
    x.quadraticCurveTo(x0+w,y0,x0+w,y0+r); x.lineTo(x0+w,y0+h-r);
    x.quadraticCurveTo(x0+w,y0+h,x0+w-r,y0+h); x.lineTo(x0+r,y0+h);
    x.quadraticCurveTo(x0,y0+h,x0,y0+h-r); x.lineTo(x0,y0+r);
    x.quadraticCurveTo(x0,y0,x0+r,y0); x.closePath();
  }
  function seeded(i){ var n=Math.sin(i*12.9898+78.233)*43758.5453; return n-Math.floor(n); }
  function fontSpec(size){ return "900 "+size+"px 'Cinzel', 'Roboto Slab', Georgia, serif"; }
  function wrappedLines(text,maxW,size){
    x.font=fontSpec(size);
    var words=String(text).trim().split(/\s+/), lines=[], line="";
    words.forEach(function(word){
      var trial=line?line+" "+word:word;
      if(line && x.measureText(trial).width>maxW){ lines.push(line); line=word; } else line=trial;
    });
    if(line) lines.push(line); return lines;
  }

  x.fillStyle="#f3e8d7"; x.fillRect(0,0,W,H);
  var paper=x.createLinearGradient(0,0,0,H);
  paper.addColorStop(0,"rgba(255,251,244,.82)"); paper.addColorStop(.22,"rgba(243,232,211,.56)");
  paper.addColorStop(.65,"rgba(229,213,181,.24)"); paper.addColorStop(1,"rgba(213,192,156,.34)");
  x.fillStyle=paper; x.fillRect(0,0,W,H);
  for(var i=0;i<1800;i++){
    var rx=seeded(i*3)*W, ry=seeded(i*3+1)*H, alpha=.010+seeded(i*3+2)*.013;
    x.fillStyle=(i%2?"rgba(255,255,255,":"rgba(145,116,72,")+alpha+")";
    x.fillRect(rx,ry,1+seeded(i+50)*2.4,1+seeded(i+80)*1.4);
  }

  var gold="#ae8137", goldDeep="#6d4d1d", ink="#2f2115";
  var outer=W*.058, inner=W*.075;
  roundedRect(outer,outer,W-outer*2,H-outer*2,W*.02); x.strokeStyle="rgba(174,129,55,.58)"; x.lineWidth=Math.max(2,W*.0026); x.stroke();
  roundedRect(inner,inner,W-inner*2,H-inner*2,W*.016); x.strokeStyle="rgba(197,159,91,.72)"; x.lineWidth=Math.max(1.6,W*.0018); x.stroke();

  // The logo is anchored from the top using W, so changing aspect ratio never moves or stretches it.
  var logoW=W*.205, logoH=logoW, logoY=outer+W*.17;
  x.textAlign="center"; x.textBaseline="middle";
  if(cardLogo.complete && cardLogo.naturalWidth){
    x.save(); x.beginPath(); x.arc(W/2,logoY,logoW*.53,0,Math.PI*2); x.closePath();
    x.fillStyle="rgba(227,204,149,.25)"; x.fill(); x.strokeStyle="rgba(175,129,55,.30)"; x.lineWidth=Math.max(3,W*.0035); x.stroke();
    x.shadowColor="rgba(0,0,0,.16)"; x.shadowBlur=W*.014; x.shadowOffsetY=W*.004;
    x.drawImage(cardLogo,W/2-logoW/2,logoY-logoH/2,logoW,logoH); x.restore();
  }

  var safeX=W*.178, maxW=W-safeX*2;
  var verseText=String(cv.text||"").toUpperCase();
  var verseTop=logoY+logoH/2+W*.082;
  var refY=H-W*.195, footerY=H-W*.084;
  var verseBottom=refY-W*.115;
  var avail=Math.max(W*.25,verseBottom-verseTop);
  var size=Math.round(W*.057), minSize=Math.round(W*.029), lines=wrappedLines(verseText,maxW,size);
  while(lines.length*size*1.12>avail && size>minSize){ size-=2; lines=wrappedLines(verseText,maxW,size); }
  var lineH=size*1.12, blockH=lines.length*lineH;
  var startY=verseTop+(avail-blockH)/2+lineH*.455-W*.008;
  x.font=fontSpec(size); x.fillStyle="#28190f";
  for(var k=0;k<lines.length;k++) x.fillText(lines[k],W/2,startY+k*lineH);

  x.strokeStyle="rgba(182,136,64,.72)"; x.lineWidth=Math.max(2,W*.0021);
  x.beginPath(); x.moveTo(W*.34,refY-W*.042); x.lineTo(W*.66,refY-W*.042); x.stroke();
  x.fillStyle="#624416"; x.font="800 "+Math.round(W*.024)+"px 'Cinzel', 'Roboto Slab', Georgia, serif"; x.fillText(cv.ref.toUpperCase(),W/2,refY);
  x.fillStyle="rgba(123,90,36,.9)"; x.font="italic "+Math.round(W*.0215)+"px 'Lora', Georgia, serif";
  x.fillText("Sharpening the man through the Message.",W/2,footerY);
}

function saveCard(){
  var cvs=$("cardCanvas"); if(!cvs) return;
  cvs.toBlob(function(blob){
    if(!blob) return toast("Couldn't build the image");
    var name="the-applied-word-podcast-"+state.cardVerse.ref.replace(/[^\w]+/g,"-").toLowerCase()+
      "-"+state.cardRatio.replace(":","x")+".png";
    var file=null;
    try{ file=new File([blob],name,{type:"image/png"}); }catch(e){}

    // Phones: offer the real share sheet so it can go straight to Photos.
    if(file && navigator.canShare && navigator.canShare({files:[file]})){
      navigator.share({files:[file]}).catch(function(){});
      return;
    }
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url; a.download=name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); },5000);
    toast("Saved");
  },"image/png");
}

function openCardForRange(b,c,vs){
  vs=(vs||[]).slice().sort(function(a,b){return a-b;});
  if(!vs.length) return;
  var text=rangeText(b,c,vs,true);
  if(!text) return toast("Download the BSB first");
  var ref=rangeRef(b,c,vs);
  state.cardVerse={ ref:ref, text:text, abbr:(state.meta[state.version]||{}).abbr||"BSB", verses:vs.slice() };
  logActivity("card",ref,"Verse card");
  state.returnTab=state.tab;
  state.tab="card"; render();
}
function openCardFor(b,c,v){ openCardForRange(b,c,[v]); }

/* ============================================================
   SETTINGS
   ============================================================ */
function settingsView(){
  var active=getTheme().id;
  var nstats=noteStats();
  var catCount=categories().length;
  var vbCount=verseBookmarks().length;
  var nprefs=notificationPrefs();
  var bibleCards=TIERS.filter(function(t){return t.available;}).map(function(t){
    var m=state.meta[t.id], current=state.version===t.id;
    return '<div class="tier modern-tier">'+
      '<div class="tier-top"><div class="tier-label">'+esc(t.abbr)+' · OFFLINE BIBLE</div><div class="tier-badge'+(m?' in':'')+'">'+(m?(current?'IN USE':'INSTALLED'):'AVAILABLE')+'</div></div>'+
      '<div class="tier-name">'+esc(t.name)+'</div>'+
      '<div class="tier-note">'+esc(t.note||'')+'</div>'+
      '<div class="tier-license">'+esc(t.license||'Public Domain')+'</div>'+
      '<div class="bar" id="bar-'+t.id+'" style="display:none"><i></i></div>'+
      (m
        ? '<div class="tier-actions">'+(current?'':'<button class="tier-btn compact" data-use="'+t.id+'">USE '+esc(t.abbr)+'</button>')+'<button class="tier-btn compact ghost" data-drop="'+t.id+'">REMOVE</button></div><div class="tier-meta">'+m.verses.toLocaleString()+' VERSES · '+m.books+' BOOKS</div>'
        : '<button class="tier-btn" data-dl="'+t.id+'">DOWNLOAD '+esc(t.abbr)+'</button>')+
    '</div>';
  }).join('');

  return '<div class="pad settings-page">'+
    '<button class="backlink" data-appback="1">&#8249; BACK</button>'+
    screenHead("Settings","Appearance, Bible library, and local data")+
    '<div class="grouphd">APP THEME</div>'+
    '<div class="theme-grid">'+THEMES.map(function(t){ return '<button class="theme-card'+(active===t.id?' on':'')+'" data-themeopt="'+t.id+'">'+
      '<span class="theme-swatch '+t.id+'"></span><span><b>'+t.name+'</b><small>'+t.meta+'</small></span></button>'; }).join('')+'</div>'+
    '<div class="grouphd settings-section-head">BIBLE LIBRARY</div>'+bibleCards+
    '<div class="settings-legal">ASV and YLT are public domain. The KJV is public domain in the United States; special Crown rights can apply to publication in the United Kingdom.</div>'+
    '<div class="grouphd settings-section-head">NOTIFICATIONS</div>'+
    '<div class="setrow"><div><div class="lbl">App notifications</div><div class="sub">'+(notificationStatus()==="granted"?"Enabled":notificationStatus()==="denied"?"Blocked in browser settings":notificationStatus()==="unsupported"?"Not supported on this browser":"Permission not granted")+'</div></div><button class="mini" data-notifyenable="1">ENABLE</button></div>'+
    '<div class="setrow"><div><div class="lbl">Podcast release reminder</div><div class="sub">Monday at 6:00 AM Pacific · '+(nprefs.podcast?"enabled":"off")+'</div></div><button class="mini" data-podcastnotify="1">'+(nprefs.podcast?"TURN OFF":"TURN ON")+'</button></div>'+
    '<div class="settings-legal">Local reminders are checked while the app is running and whenever it opens. True push while the app is fully closed requires a separate web-push service.</div>'+
    '<div class="grouphd settings-section-head">YOUR DATA</div>'+
    '<div class="setrow"><div><div class="lbl">Highlights &amp; saved Scripture</div><div class="sub">'+Object.keys(marks()).length+' marked verses · '+bookmarks().length+' chapter bookmarks · '+vbCount+' verse bookmarks · '+catCount+' categories</div></div><button class="mini" data-go="bible">OPEN</button></div>'+
    '<div class="setrow"><div><div class="lbl">Notes library</div><div class="sub">'+nstats.docs+' saved notes · '+nstats.prayers+' prayer requests · '+nstats.chars.toLocaleString()+' characters</div></div><button class="mini" data-go="notes">OPEN</button></div>'+
    '<div class="setrow"><div><div class="lbl">Backup app data</div><div class="sub">Exports notes, reminders, prayer categories, categories, bookmarks, highlights, reading-plan progress, activity, and preferences.</div></div><button class="mini" data-export="1">EXPORT</button></div>'+
    '<div class="setrow"><div><div class="lbl">Activity history</div><div class="sub">'+activity().length+' recent actions saved on this device.</div></div><button class="mini" data-clearhistory="1">CLEAR</button></div>'+
    '<div class="setrow"><div><div class="lbl">Reset app data</div><div class="sub">Removes local notes, categories, marks, bookmarks, activity, streaks, and downloaded Bible copies.</div></div><button class="mini danger" data-wipe="1">RESET</button></div>'+
    '<div class="foot">BIBLE TEXT DOWNLOADS AND YOUR READING DATA STAY ON THIS DEVICE</div></div>';
}

function doDownload(id){
  var tier=null; TIERS.forEach(function(t){ if(t.id===id) tier=t; });
  if(!tier) return;
  var btn=document.querySelector('[data-dl="'+id+'"]');
  var bar=$("bar-"+id);
  if(btn){ btn.disabled=true; btn.innerHTML='<span class="spin"></span> DOWNLOADING…'; }
  if(bar) bar.style.display="block";

  downloadTier(tier, function(pct){
    if(bar) bar.querySelector("i").style.width=pct+"%";
    if(btn && pct<100) btn.innerHTML='<span class="spin"></span> DOWNLOADING '+pct+'%';
    else if(btn) btn.innerHTML='<span class="spin"></span> SETTING IT UP…';
  })
  .then(function(meta){
    state.meta[id]=meta;
    return loadVersion(id).then(function(){
      state.version=id; ls("version",id);
      logActivity("download",tier.name,meta.books+" books");
      state.tab="bible"; state.bview="read"; state.sel=null;
      toast(meta.abbr+" ready · "+meta.verses.toLocaleString()+" verse records");
      render();
    });
  })
  .catch(function(err){
    if(bar) bar.style.display="none";
    if(btn){ btn.disabled=false; btn.textContent="DOWNLOAD"; }
    toast("Download failed — try again");
  });
}

/* ============================================================
   RENDER + WIRING
   ============================================================ */
var TABS=[
  {id:"devotion", label:"DEVOTION"},
  {id:"podcast", label:"PODCAST"},
  {id:"bible", label:"BIBLE"},
  {id:"notes", label:"NOTES"},
  {id:"history", label:"HISTORY"}
];

function backAvailable(){
  if(state.reminderTarget) return true;
  if(state.tab==="settings" || state.tab==="card") return true;
  if(state.tab==="devotion" && state.devMode==="plan") return true;
  if(state.tab==="bible" && (state.bview!=="read" || state.categoryOpen)) return true;
  if(state.tab==="notes" && state.noteId) return true;
  return false;
}
function appBack(){
  if(state.reminderTarget){ state.reminderTarget=null; render(); return; }
  if(state.tab==="notes" && state.noteId){ saveOpenNote(); state.noteId=null; state.notePreview=false; render(); return; }
  if(state.tab==="bible" && state.categoryOpen){ state.categoryOpen=null; state.bview="categories"; render(); return; }
  if(state.tab==="bible" && state.bview!=="read"){ state.bview="read"; state.sel=null; render(); return; }
  if(state.tab==="devotion" && state.devMode==="plan"){ state.devMode="today"; render(); return; }
  if(state.tab==="card"){ state.tab=state.returnTab||"bible"; render(); return; }
  if(state.tab==="settings"){ state.tab=state.returnTab||"devotion"; render(); return; }
}

function screenHTML(){
  switch(state.tab){
    case "devotion": return devotionView();
    case "podcast":  return podcastView();
    case "bible":    return bibleView();
    case "notes":    return notesView();
    case "history":  return historyView();
    case "card":     return cardView();
    case "settings": return settingsView();
    default:         return devotionView();
  }
}

function render(){
  applyTheme();
  var back=$("globalBack"); if(back) back.hidden=!backAvailable();
  var scr=$("screen");
  var keepScroll=(state.tab==="bible" && state.bview==="read") ? scr.scrollTop : 0;
  scr.innerHTML=screenHTML();
  scr.scrollTop=keepScroll;

  var streakEl=$("streakN"); if(streakEl) streakEl.textContent=getStreak();

  [].forEach.call(document.querySelectorAll("nav button"),function(b){
    var on = b.dataset.tab===state.tab ||
             (state.tab==="card" && b.dataset.tab==="bible") ||
             (state.tab==="settings" && b.dataset.tab==="bible");
    b.classList.toggle("on", on);
  });

  wire(scr);
  if(state.tab==="card") drawCard();
  if(state.tab==="devotion" && state.devMode==="today") startHeroCycle(); else stopHeroCycle();
}

function on(root, sel, fn){
  [].forEach.call(root.querySelectorAll(sel), fn);
}

function wire(scr){
  var w=$("walkBtn");
  if(w) w.onclick=function(){ markWalk(); render(); };

  on(scr,"[data-go]",function(b){
    b.onclick=function(){
      var next=b.dataset.go;
      if(next==="settings") state.returnTab=state.tab;
      if(state.tab==="notes" && next!=="notes") saveOpenNote();
      state.tab=next;
      if(next!=="notes"){ state.noteId=null; state.notePreview=false; }
      render();
    };
  });
  on(scr,"[data-appback]",function(b){ b.onclick=appBack; });
  on(scr,"[data-dev]",function(b){
    b.onclick=function(){ state.devMode=b.dataset.dev; if(state.devMode==="today" && (state.heroIndex<0 || state.heroIndex>=HERO_IMAGES.length)) state.heroIndex=baseHeroIndex(); render(); };
  });
  on(scr,"[data-themeopt]",function(b){
    b.onclick=function(){ state.theme=b.dataset.themeopt; ls("theme", state.theme); applyTheme(); render(); };
  });
  on(scr,"[data-half]",function(b){
    b.onclick=function(){ state.spHalf=b.dataset.half; loadSpurgeon(); };
  });
  var sp=$("spDate");
  if(sp) sp.onchange=function(){ state.spDate=sp.value; loadSpurgeon(); };
  on(scr,"[data-spretry]",function(b){
    b.onclick=function(){ loadSpurgeon(); };
  });

  var pd=$("planDate");
  if(pd) pd.onchange=function(){ state.planDate=pd.value; render(); };
  on(scr,"[data-plan]",function(b){
    b.onclick=function(e){
      if(e.target.closest("[data-planopen]")) return;
      var idx=+b.dataset.plan;
      var was=(planDone()[state.planDate]||[]).indexOf(idx)>-1;
      togglePlanReading(state.planDate,idx);
      if(!was) logActivity("plan",state.planDate,"M'Cheyne reading");
      render();
    };
  });
  on(scr,"[data-planopen]",function(b){
    b.onclick=function(e){ e.stopPropagation(); openRef(b.dataset.planopen); };
  });

  // Bible navigation
  on(scr,"[data-bview]",function(b){
    b.onclick=function(){ state.bview=b.dataset.bview; state.sel=null; render(); };
  });
  on(scr,"[data-step]",function(b){
    b.onclick=function(){ stepChapter(+b.dataset.step); };
  });
  on(scr,"[data-book]",function(b){
    b.onclick=function(){
      state.book=+b.dataset.book; state.chapter=1; state.bview="chapters";
      ls("book",state.book); ls("chapter",1); render();
    };
  });
  on(scr,"[data-chap]",function(b){
    b.onclick=function(){
      state.chapter=+b.dataset.chap; state.bview="read"; state.sel=null;
      ls("chapter",state.chapter); recordChapterRead(state.book,state.chapter); render();
    };
  });
  on(scr,"[data-v]",function(b){
    b.onclick=function(e){
      if(e.target.closest("button,a")) return;
      toggleVerseSelection(+b.dataset.v);
    };
  });
  on(scr,"[data-font]",function(b){
    b.onclick=function(){
      state.fontScale=Math.max(.85,Math.min(1.35,state.fontScale+(+b.dataset.font*.1)));
      ls("fontScale",state.fontScale.toFixed(2)); render();
    };
  });
  on(scr,"[data-mark]",function(b){
    b.onclick=function(){
      var added=toggleBookmark(state.book,state.chapter);
      if(added) logActivity("bookmark",refOf(state.book,state.chapter),"Chapter bookmark");
      toast(added?"Bookmarked":"Bookmark removed"); render();
    };
  });
  on(scr,"[data-jump]",function(b){
    b.onclick=function(){
      var p=b.dataset.jump.split(":");
      state.book=+p[0]; state.chapter=+p[1];
      state.tab="bible"; state.bview="read"; state.sel=null;
      ls("book",state.book); ls("chapter",state.chapter);
      recordChapterRead(state.book,state.chapter); render();
    };
  });
  on(scr,"[data-jumpverse]",function(b){
    b.onclick=function(){
      var p=b.dataset.jumpverse.split(":");
      state.book=+p[0]; state.chapter=+p[1]; var v=+p[2];
      state.tab="bible"; state.bview="read"; state.sel=null;
      ls("book",state.book); ls("chapter",state.chapter);
      recordChapterRead(state.book,state.chapter); render();
      setTimeout(function(){
        var el=document.querySelector('[data-v="'+v+'"]');
        if(el) el.scrollIntoView({block:"center",behavior:"smooth"});
      },60);
    };
  });

  var searchForm=$("bibleSearchForm");
  if(searchForm) searchForm.onsubmit=function(e){
    e.preventDefault();
    var inp=$("bibleSearchInput");
    state.searchQuery=inp?inp.value.trim():"";
    render();
  };
  var notesEditor=$("notesEditor"), noteTitle=$("noteTitle");
  if(notesEditor) notesEditor.oninput=saveOpenNote;
  if(noteTitle) noteTitle.oninput=saveOpenNote;
  on(scr,"[data-prayertext]",function(t){
    var grow=function(){ t.style.height="auto"; t.style.height=Math.max(96,t.scrollHeight)+"px"; };
    grow();
    t.oninput=function(){ savePrayer(t.dataset.prayertext,t.value); grow(); };
  });
  var versionSelect=$("versionSelect");
  if(versionSelect){
    versionSelect.onchange=function(){
      var id=versionSelect.value;
      if(!state.meta[id]) return;
      state.version=id; ls("version",id); state.sel=null;
      loadVersion(id).then(function(){ render(); toast("Now reading "+((state.meta[id]||{}).abbr||id.toUpperCase())); });
    };
  }

  // History
  on(scr,"[data-history]",function(b){
    b.onclick=function(){ state.historyTab=b.dataset.history; render(); };
  });
  on(scr,"[data-notesection]",function(b){
    b.onclick=function(){ saveOpenNote(); state.noteSection=b.dataset.notesection; state.noteId=null; state.notePreview=false; ls("noteSection", state.noteSection); render(); };
  });
  on(scr,"[data-notenew]",function(b){
    b.onclick=function(){ var doc=createDoc(b.dataset.notenew); state.noteSection=b.dataset.notenew; state.noteId=doc.id; state.notePreview=false; render(); setTimeout(function(){var t=$("noteTitle");if(t)t.focus();},20); };
  });
  on(scr,"[data-noteopen]",function(b){ b.onclick=function(){ state.noteId=b.dataset.noteopen; state.notePreview=false; render(); }; });
  on(scr,"[data-noteback]",function(b){ b.onclick=function(){ saveOpenNote(); state.noteId=null; state.notePreview=false; render(); }; });
  on(scr,"[data-notesave]",function(b){ b.onclick=function(){ saveOpenNote(); state.noteId=null; state.notePreview=false; toast("Note saved"); render(); }; });
  on(scr,"[data-notedelete]",function(b){
    b.onclick=function(){
      if(b.dataset.armed){ deleteDoc(state.noteSection,b.dataset.notedelete); state.noteId=null; state.notePreview=false; toast("Note deleted"); render(); }
      else { b.dataset.armed="1"; b.textContent="DELETE?"; }
    };
  });
  on(scr,"[data-md]",function(b){ b.onclick=function(){ applyMarkdownAction(b.dataset.md); }; });
  on(scr,"[data-notepreview]",function(b){ b.onclick=function(){ saveOpenNote(); state.notePreview=!state.notePreview; render(); }; });
  on(scr,"[data-prayernew]",function(b){ b.onclick=function(){ var item=createPrayer(); render(); setTimeout(function(){var t=document.querySelector('[data-prayertext="'+item.id+'"]');if(t)t.focus();},20); }; });
  on(scr,"[data-prayertoggle]",function(b){ b.onclick=function(){ togglePrayer(b.dataset.prayertoggle); render(); }; });
  on(scr,"[data-prayerdelete]",function(b){
    b.onclick=function(){ if(b.dataset.armed){ deletePrayer(b.dataset.prayerdelete); render(); } else { b.dataset.armed="1"; b.textContent="?"; } };
  });
  on(scr,"[data-prayercategory]",function(s){
    s.onchange=function(){ setPrayerCategory(s.dataset.prayercategory,s.value); render(); };
  });
  on(scr,"[data-prayerpin]",function(b){
    b.onclick=function(){ togglePrayerPin(b.dataset.prayerpin); render(); };
  });
  on(scr,"[data-reminderdoc]",function(b){
    b.onclick=function(){ saveOpenNote(); state.reminderTarget={type:"note",section:state.noteSection,id:b.dataset.reminderdoc}; render(); };
  });
  on(scr,"[data-reminderprayer]",function(b){
    b.onclick=function(){ state.reminderTarget={type:"prayer",id:b.dataset.reminderprayer}; render(); };
  });
  on(scr,"[data-reminderclose]",function(b){ b.onclick=function(){ state.reminderTarget=null; render(); }; });
  on(scr,"[data-reminderoverlay]",function(o){ o.onclick=function(e){ if(e.target===o){ state.reminderTarget=null; render(); } }; });
  on(scr,"[data-remindersave]",function(b){ b.onclick=saveReminderFromPanel; });
  on(scr,"[data-reminderremove]",function(b){ b.onclick=function(){ setItemReminder(state.reminderTarget,null); state.reminderTarget=null; toast("Reminder removed"); render(); }; });
  on(scr,"[data-notifyenable]",function(b){
    b.onclick=function(){ ensureNotificationPermission().then(function(status){ toast(status==="granted"?"Notifications enabled":status==="denied"?"Notifications are blocked":"Notifications unavailable"); render(); }); };
  });
  var reminderFreq=$("reminderFreq");
  if(reminderFreq){ reminderFreq.onchange=updateReminderFormVisibility; updateReminderFormVisibility(); }
  on(scr,"[data-podcastnotify]",function(b){
    b.onclick=function(){
      var prefs=notificationPrefs();
      if(prefs.podcast){ prefs.podcast=false; saveNotificationPrefs(prefs); toast("Podcast release reminder off"); render(); return; }
      ensureNotificationPermission().then(function(status){
        prefs=notificationPrefs(); prefs.podcast=true; saveNotificationPrefs(prefs);
        toast(status==="granted"?"Podcast release reminder enabled":"Release reminder enabled in the app"); render(); checkLocalReminders();
      });
    };
  });
  on(scr,"[data-clearhistory]",function(b){
    b.onclick=function(){
      jset("activity",[]);
      toast("Activity history cleared");
      render();
    };
  });

  // Legacy saved-list wiring
  on(scr,"[data-list]",function(b){
    b.onclick=function(){ state.listTab=b.dataset.list; render(); };
  });

  // Verse selection actions
  on(scr,"[data-selclear]",function(b){ b.onclick=function(){ state.sel=null; render(); }; });
  on(scr,"[data-selact]",function(b){
    b.onclick=function(){
      if(!state.sel) return;
      var vs=selectedVerseList(), ref=rangeRef(state.sel.b,state.sel.c,vs), act=b.dataset.selact;
      if(act==="highlight"){ openSheet(); return; }
      if(act==="note"){
        openSheet();
        setTimeout(function(){ var n=$("sheetNote"); if(n){ n.style.display="block"; n.focus(); } },30);
        return;
      }
      if(act==="copy"){
        var out=rangeOutput(state.sel.b,state.sel.c,vs);
        if(navigator.clipboard) navigator.clipboard.writeText(out).then(function(){ logActivity("share",ref,"Copied verse selection"); toast("Copied"); });
        else toast("Copy isn't available here");
        return;
      }
      if(act==="card"){ openCardForRange(state.sel.b,state.sel.c,vs); return; }
      if(act==="bookmark"){
        var r=toggleVerseBookmarks(state.sel.b,state.sel.c,vs);
        if(r.added) logActivity("bookmark",ref,"Verse bookmark");
        toast(r.added ? (r.added+" bookmarked") : "Bookmarks removed"); render(); return;
      }
      if(act==="category"){ openCategoryPicker(); return; }
    };
  });

  // Category page actions
  on(scr,"[data-catopen]",function(b){ b.onclick=function(){ state.categoryOpen=b.dataset.catopen; state.bview="categories"; render(); }; });
  on(scr,"[data-catback]",function(b){ b.onclick=function(){ state.categoryOpen=null; render(); }; });
  on(scr,"[data-catcreate]",function(b){ b.onclick=function(){ var inp=$("categoryLibraryName"); var cat=createCategory(inp?inp.value:""); if(cat){ state.categoryOpen=cat.id; render(); } else toast("Enter a category name"); }; });
  on(scr,"[data-catrename]",function(b){ b.onclick=function(){ var cat=categoryById(b.dataset.catrename); if(!cat) return; var name=prompt("Rename category",cat.name); if(name){ renameCategory(cat.id,name); render(); } }; });
  on(scr,"[data-catdelete]",function(b){ b.onclick=function(){ var cat=categoryById(b.dataset.catdelete); if(!cat) return; if(confirm("Delete category ‘"+cat.name+"’? The verses themselves will not be changed.")){ deleteCategory(cat.id); state.categoryOpen=null; render(); } }; });
  on(scr,"[data-catremove]",function(b){ b.onclick=function(){ var p=b.dataset.catremove.split("|"); removeVerseFromCategory(p[0],p[1]); render(); }; });

  // Cards
  on(scr,"[data-ratio]",function(b){
    b.onclick=function(){ state.cardRatio=b.dataset.ratio; render(); };
  });
  on(scr,"[data-savecard]",function(b){ b.onclick=saveCard; });
  on(scr,"[data-cardref]",function(b){
    b.onclick=function(){ cardFromRef(b.dataset.cardref); };
  });
  on(scr,"[data-spcard]",function(b){
    b.onclick=function(){
      var s=state.spData; if(!s||!s.verse) return;
      state.cardVerse={ ref:s.ref||"Spurgeon", text:s.verse, abbr:"" };
      logActivity("card",s.ref||"Spurgeon","Verse card");
      state.tab="card"; render();
    };
  });
  on(scr,"[data-openref]",function(b){
    b.onclick=function(){ openRef(b.dataset.openref); };
  });
  on(scr,"[data-podact]",function(b){
    b.onclick=function(){ logActivity("podcast","The Applied Word Podcast","Spotify"); };
  });

  // Settings / Bible library
  on(scr,"[data-dl]",function(b){ b.onclick=function(){ doDownload(b.dataset.dl); }; });
  on(scr,"[data-use]",function(b){
    b.onclick=function(){
      state.version=b.dataset.use; ls("version",state.version);
      loadVersion(state.version).then(function(){ toast("Now reading "+state.meta[state.version].abbr); render(); });
    };
  });
  on(scr,"[data-drop]",function(b){
    b.onclick=function(){
      var id=b.dataset.drop;
      removeTier(id).then(function(){
        delete state.meta[id]; delete state.loaded[id];
        if(state.version===id){
          var remaining=installedTiers()[0];
          state.version=remaining?remaining.id:"bsb";
          ls("version",state.version);
        }
        toast("Local Bible copy removed"); render();
      });
    };
  });
  on(scr,"[data-export]",function(b){
    b.onclick=function(){
      var data={ marks:marks(), bookmarks:bookmarks(), verseBookmarks:verseBookmarks(), categories:categories(), noteLibrary:noteLibrary(), notificationPrefs:notificationPrefs(), plandone:planDone(), activity:activity(), theme:state.theme, version:state.version, fontScale:state.fontScale, exported:new Date().toISOString() };
      var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
      var url=URL.createObjectURL(blob);
      var a=document.createElement("a");
      a.href=url; a.download="the-applied-word-podcast-data.json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); },5000);
      toast("Exported");
    };
  });
  on(scr,"[data-wipe]",function(b){
    b.onclick=function(){
      if(b.dataset.armed){
        jset("marks",{}); jset("bookmarks",[]); jset("verseBookmarks",[]); jset("verseCategories",[]); jset("plandone",{}); jset("activity",[]); jset("noteLibrary",{docs:{sermon:[],study:[],men:[]},prayers:[]}); jset("sectionNotes",{}); jset("notificationPrefs",{podcast:false,lastPodcastKey:""});
        ls("streak","0"); ls("lastWalk","");
        Promise.all(TIERS.filter(function(t){return t.available;})
          .map(function(t){ return removeTier(t.id); }))
          .then(function(){ state.meta={}; state.loaded={}; state.tab="devotion"; toast("Everything cleared"); render(); });
      } else {
        b.dataset.armed="1"; b.textContent="TAP AGAIN TO CONFIRM";
      }
    };
  });
}

/* Opens a reference like "James 1:22" or "Psalms 126, 127, 128". */
function parseRef(ref){
  var m=String(ref).match(/^\s*((?:[1-3]\s*)?[A-Za-z][A-Za-z' ]*?)\s+(\d+)(?:\s*:\s*(\d+))?/);
  if(!m) return null;
  var b=resolveBook(m[1]);
  if(b===undefined) return null;
  return { b:b, c:+m[2], v:m[3]?+m[3]:null };
}
function openRef(ref){
  var r=parseRef(ref);
  if(!r) return toast("Couldn't read that reference");
  if(!anyInstalled()){ state.tab="bible"; render(); return toast("Download the BSB first"); }
  state.book=r.b; state.chapter=Math.min(r.c, CHAPS[r.b]);
  state.tab="bible"; state.bview="read"; state.sel=null;
  ls("book",state.book); ls("chapter",state.chapter);
  recordChapterRead(state.book,state.chapter);
  render();
  if(r.v){
    setTimeout(function(){
      var el=document.querySelector('[data-v="'+r.v+'"]');
      if(el) el.scrollIntoView({block:"center",behavior:"smooth"});
    },60);
  }
}
function cardFromRef(ref){
  var r=parseRef(ref);
  if(!r||!r.v) return toast("Pick a single verse for a card");
  if(!verseText(r.b,r.c,r.v)){ state.tab="bible"; render(); return toast("Download the BSB first"); }
  openCardFor(r.b,r.c,r.v);
}

/* ---------- sheet controls (outside the re-rendered screen) ---------- */
function shareVerse(b,c,v){
  var t=verseText(b,c,v);
  if(!t) return toast("Verse text isn't available");
  var ref=refOf(b,c,v), abbr=(state.meta[state.version]||{}).abbr||"BSB";
  var out='“'+t+'” — '+ref+' ('+abbr+')';
  if(navigator.share){
    navigator.share({title:ref,text:out}).then(function(){
      logActivity("share",ref,"Verse shared");
    }).catch(function(){});
  } else if(navigator.clipboard){
    navigator.clipboard.writeText(out).then(function(){
      logActivity("share",ref,"Copied for sharing"); toast("Copied for sharing");
    });
  } else toast("Sharing isn't available here");
}
function shareRange(b,c,vs){
  var ref=rangeRef(b,c,vs), out=rangeOutput(b,c,vs);
  if(navigator.share){
    navigator.share({title:ref,text:out}).then(function(){ logActivity("share",ref,"Verse selection shared"); }).catch(function(){});
  } else if(navigator.clipboard){
    navigator.clipboard.writeText(out).then(function(){ logActivity("share",ref,"Copied for sharing"); toast("Copied for sharing"); });
  } else toast("Sharing isn't available here");
}


function initSheet(){
  $("scrim").onclick=closeSheet;
  $("sheetClose").onclick=closeSheet;
  if($("sheetPrevVerse")) $("sheetPrevVerse").onclick=function(){ extendSelection(-1); };
  if($("sheetNextVerse")) $("sheetNextVerse").onclick=function(){ extendSelection(1); };
  if($("sheetRange")) $("sheetRange").onclick=resetSelection;

  [].forEach.call(document.querySelectorAll(".sw"),function(s){
    s.onclick=function(){
      if(!state.sel) return;
      var c=s.dataset.c||null, vs=selectedVerseList(), allSame=!!c;
      vs.forEach(function(v){ var cur=markFor(state.sel.b,state.sel.c,v); if(!cur||cur.hl!==c) allSame=false; });
      var next=(allSame?null:c);
      vs.forEach(function(v){ setMark(state.sel.b,state.sel.c,v,{hl:next}); });
      if(next) logActivity("highlight",rangeRef(state.sel.b,state.sel.c,vs),next+" highlight");
      render(); refreshSheetSelection();
    };
  });

  $("sheetNoteBtn").onclick=function(){
    var n=$("sheetNote");
    n.style.display = n.style.display==="block" ? "none" : "block";
    if(n.style.display==="block") n.focus();
  };
  $("sheetNote").onblur=function(){
    if(!state.sel) return;
    var s=state.sel, vs=selectedVerseList(), val=$("sheetNote").value.trim();
    vs.forEach(function(v){ setMark(s.b,s.c,v,{note:val||null}); });
    if(val) logActivity("note",rangeRef(s.b,s.c,vs),"Bible note");
    render(); refreshSheetSelection();
  };
  $("sheetShareBtn").onclick=function(){
    if(!state.sel) return;
    shareRange(state.sel.b,state.sel.c,selectedVerseList());
  };
  $("sheetCardBtn").onclick=function(){
    if(!state.sel) return;
    var s=state.sel, vs=selectedVerseList(); closeSheet(); openCardForRange(s.b,s.c,vs);
  };
  $("sheetCopyBtn").onclick=function(){
    if(!state.sel) return;
    var out=rangeOutput(state.sel.b,state.sel.c,selectedVerseList());
    if(navigator.clipboard) navigator.clipboard.writeText(out).then(function(){ toast("Copied"); });
    else toast("Copy isn't available here");
  };
}

function initCategoryPicker(){
  var overlay=$("categoryOverlay"), close=$("categoryClose"), list=$("categoryList"), input=$("categoryName"), create=$("categoryCreateApply");
  if(!overlay||!list||!input||!create) return;
  if(close) close.onclick=closeCategoryPicker;
  overlay.onclick=function(e){ if(e.target===overlay) closeCategoryPicker(); };
  list.onclick=function(e){
    var b=e.target.closest("[data-categoryapply]");
    if(!b||!state.sel) return;
    var added=addSelectionToCategory(b.dataset.categoryapply,state.sel.b,state.sel.c,selectedVerseList());
    var cat=categoryById(b.dataset.categoryapply);
    if(added) logActivity("category",rangeRef(state.sel.b,state.sel.c,selectedVerseList()),cat?cat.name:"Category");
    toast(added ? "Added to "+(cat?cat.name:"category") : "Already in that category");
    closeCategoryPicker(); render();
  };
  create.onclick=function(){
    if(!state.sel) return;
    var cat=createCategory(input.value);
    if(!cat){ toast("Enter a category name"); return; }
    var added=addSelectionToCategory(cat.id,state.sel.b,state.sel.c,selectedVerseList());
    if(added) logActivity("category",rangeRef(state.sel.b,state.sel.c,selectedVerseList()),cat.name);
    toast("Added to "+cat.name); closeCategoryPicker(); render();
  };
  input.onkeydown=function(e){ if(e.key==="Enter"){ e.preventDefault(); create.click(); } };
}

/* ---------- temporary install promotion ---------- */
var deferredInstallPrompt=null;
var installFabTimer=null;

function isStandaloneApp(){
  return !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone===true;
}
function isIOSDevice(){
  var ua=navigator.userAgent||"";
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
}
function isAndroidDevice(){ return /Android/i.test(navigator.userAgent||""); }
function isIOSSafari(){
  var ua=navigator.userAgent||"";
  return isIOSDevice() && /Safari/i.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(ua);
}
function installDismissed(){
  try{ return sessionStorage.getItem("tawInstallDismissed")==="1"; }catch(e){ return false; }
}
function setInstallDismissed(){
  try{ sessionStorage.setItem("tawInstallDismissed","1"); }catch(e){}
}
function hideInstallFab(){
  var fab=$("installFab");
  if(fab) fab.hidden=true;
  clearTimeout(installFabTimer);
}
function showInstallFab(){
  var fab=$("installFab");
  if(!fab || isStandaloneApp() || installDismissed()) return;
  if(!(isIOSDevice() || isAndroidDevice() || deferredInstallPrompt)) return;
  // This is intentionally a temporary floating promotion: it disappears
  // after installation or when dismissed for the current browser session.
  clearTimeout(installFabTimer);
  installFabTimer=setTimeout(function(){
    if(!isStandaloneApp() && !installDismissed()) fab.hidden=false;
  },900);
}
function closeInstallGuide(){
  var overlay=$("installOverlay");
  if(overlay) overlay.hidden=true;
}
function installStep(n,icon,title,copy){
  return '<div class="install-step"><span class="install-step-num">'+n+'</span>'+
    '<span class="install-step-icon">'+icon+'</span><span><b>'+title+'</b><small>'+copy+'</small></span></div>';
}
function openInstallGuide(){
  var overlay=$("installOverlay"), guide=$("installGuide"), title=$("installTitle");
  if(!overlay||!guide||!title) return;
  if(isIOSDevice()){
    title.textContent="Add to iPhone Home Screen";
    guide.innerHTML=(isIOSSafari()?"":'<div class="install-notice"><b>Open this page in Safari first.</b><span>iPhone installs web apps from Safari.</span></div>')+
      installStep("1","↗","Tap Share","In Safari, tap Share. With Compact tabs, tap More first, then Share.")+
      installStep("2","＋","Add to Home Screen","Scroll down and choose Add to Home Screen. If it is hidden, use Edit Actions.")+
      installStep("3","✓","Open as Web App","Turn on Open as Web App, then tap Add.");
  } else if(isAndroidDevice()){
    title.textContent="Install on Android";
    guide.innerHTML=deferredInstallPrompt
      ? '<div class="install-notice ready"><b>Ready to install.</b><span>Tap the gold Install button below to use your browser’s native install prompt.</span></div><button id="installNativeBtn" class="cta install-native" type="button">INSTALL THE APP</button>'
      : installStep("1","⋮","Open the browser menu","In Chrome or your Android browser, tap the menu button.")+
        installStep("2","↓","Choose Install app","Depending on the browser it may say Install app or Add to Home screen.")+
        installStep("3","✓","Confirm Install","The Applied Word Podcast will appear with your other apps.");
  } else {
    title.textContent="Install The Applied Word Podcast";
    guide.innerHTML=deferredInstallPrompt
      ? '<div class="install-notice ready"><b>This browser can install the app.</b><span>Use the button below to continue.</span></div><button id="installNativeBtn" class="cta install-native" type="button">INSTALL THE APP</button>'
      : '<div class="install-notice"><b>Use your browser’s install option.</b><span>Look for Install app or Add to Home screen in the browser menu.</span></div>';
  }
  overlay.hidden=false;
  var nativeBtn=$("installNativeBtn");
  if(nativeBtn) nativeBtn.onclick=triggerNativeInstall;
}
async function triggerNativeInstall(){
  if(!deferredInstallPrompt){ openInstallGuide(); return; }
  closeInstallGuide();
  hideInstallFab();
  try{
    deferredInstallPrompt.prompt();
    var choice=await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null;
    if(choice && choice.outcome==="accepted"){
      setInstallDismissed();
      toast("App installed");
    } else {
      setInstallDismissed();
    }
  }catch(e){
    deferredInstallPrompt=null;
    openInstallGuide();
  }
}
function initInstallPromotion(){
  var fab=$("installFab"), fabClose=$("installFabClose"), close=$("installClose"), overlay=$("installOverlay");
  if(!fab) return;
  if(isStandaloneApp()){ hideInstallFab(); return; }

  fab.onclick=function(e){
    if(e.target===fabClose) return;
    if(deferredInstallPrompt) triggerNativeInstall();
    else openInstallGuide();
  };
  if(fabClose) fabClose.onclick=function(e){
    e.preventDefault(); e.stopPropagation(); setInstallDismissed(); hideInstallFab();
  };
  if(close) close.onclick=closeInstallGuide;
  if(overlay) overlay.onclick=function(e){ if(e.target===overlay) closeInstallGuide(); };
  showInstallFab();
}

window.addEventListener("beforeinstallprompt",function(e){
  e.preventDefault();
  deferredInstallPrompt=e;
  showInstallFab();
});
window.addEventListener("appinstalled",function(){
  deferredInstallPrompt=null;
  setInstallDismissed();
  hideInstallFab();
  closeInstallGuide();
});
if(window.matchMedia){
  var standaloneQuery=window.matchMedia("(display-mode: standalone)");
  if(standaloneQuery.addEventListener) standaloneQuery.addEventListener("change",function(e){ if(e.matches) hideInstallFab(); });
}

/* ---------- boot ---------- */
[].forEach.call(document.querySelectorAll("nav button"),function(b){
  b.onclick=function(){
    if(state.tab==="notes") saveOpenNote();
    state.tab=b.dataset.tab;
    state.returnTab=state.tab;
    if(state.tab==="bible") state.bview="read";
    if(state.tab!=="notes"){ state.noteId=null; state.notePreview=false; }
    if(state.tab==="podcast") logActivity("podcast","The Applied Word Podcast","Podcast tab");
    render();
  };
});

var globalBack=$("globalBack");
if(globalBack) globalBack.onclick=appBack;
var settingsBtn=$("settingsBtn");
if(settingsBtn) settingsBtn.onclick=function(){ if(state.tab==="notes") saveOpenNote(); state.returnTab=state.tab; state.tab="settings"; render(); };

applyTheme();
initSheet();
initCategoryPicker();
initInstallPromotion();

refreshMeta()
  .then(function(){
    if(!state.meta[state.version]){
      var first=Object.keys(state.meta)[0];
      if(first){ state.version=first; ls("version",first); }
    }
    return state.meta[state.version] ? loadVersion(state.version) : null;
  })
  .catch(function(){})
  .then(function(){ render(); });

render();

setTimeout(checkLocalReminders,1800);
setInterval(checkLocalReminders,60000);
window.addEventListener("focus",checkLocalReminders);
document.addEventListener("visibilitychange",function(){ if(!document.hidden) checkLocalReminders(); });

/* ---------- offline shell ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  });
}
