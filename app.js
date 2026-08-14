/* ============================================================
   THE APPLIED WORD PODCAST — app
   ============================================================ */

var SHOW_URL  = "https://open.spotify.com/show/75QaXUSGooCOG8oqKhuNmG";
var EMBED_URL = "https://open.spotify.com/embed/show/75QaXUSGooCOG8oqKhuNmG?utm_source=generator&theme=0";

/* ---------- small helpers ---------- */
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
function bold(s){ return esc(s).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"); }
function pad(n){ return String(n).length < 2 ? "0"+n : String(n); }
function today(){ return new Date(); }
function dayOfYear(d){ return Math.floor((d - new Date(d.getFullYear(),0,0)) / 86400000); }
function stampOf(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function $(id){ return document.getElementById(id); }

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
  // card
  cardRatio: "9:16", cardVerse: null
};

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
    bookmark:"★",podcast:"▶",download:"⇩",plan:"✓"}[type] || "•";
}
function activityLabel(type){
  return {walk:"Devotional completed",read:"Read Scripture",highlight:"Highlighted verse",
    note:"Added a note",share:"Shared a verse",card:"Created a verse card",
    bookmark:"Bookmarked chapter",podcast:"Opened podcast",download:"Downloaded Bible",
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

  return '<div class="pad">'+
    '<div class="datestrip"><div class="daynum">'+n+'</div><div class="daymeta">'+
      d.toLocaleDateString("en-US",{weekday:"long"}).toUpperCase()+" · "+
      d.toLocaleDateString("en-US",{month:"long",day:"numeric"}).toUpperCase()+
      "<br>TODAY'S WORD</div></div>"+

    '<div class="tabsel devotion-tabs" style="margin-top:18px">'+
      '<button class="'+(state.devMode==="today"?"on":"")+'" data-dev="today">TODAY</button>'+
      '<button class="'+(state.devMode==="plan"?"on":"")+'" data-dev="plan">PLAN</button>'+
    '</div>'+

    '<h1>'+esc(dev.title[0])+'<br><em>'+esc(dev.title[1])+'</em></h1>'+
    '<div class="rule"></div>'+

    '<div class="bracket"><p class="verse">'+esc(dev.verse)+'</p>'+
      '<div class="ref" style="margin-top:14px">'+esc(dev.ref)+' · BSB</div></div>'+

    '<div class="body" style="margin-top:24px">'+
      dev.body.map(function(p){ return "<p>"+bold(p)+"</p>"; }).join("")+'</div>'+

    '<div class="carry"><div class="tag">CARRY THIS</div><div class="line">'+dev.carry+'</div></div>'+

    '<div class="walk"><h3>THE WALK</h3><p>'+esc(dev.walk)+'</p>'+
      (done
        ? '<div class="stamped"><div class="seal">&#10022; WALKED IT · DAY '+n+' &#10022;</div>'+
          '<div class="sub">'+getStreak()+'-DAY STREAK</div></div>'
        : '<button class="stamp-btn" id="walkBtn">MARK THE WALK DONE</button>')+
      '<button class="cta ghost" data-openref="'+esc(dev.ref)+'">READ THE CHAPTER</button>'+
      '<button class="cta ghost" data-cardref="'+esc(dev.ref)+'">MAKE A VERSE CARD</button>'+
    '</div>'+

    '<div class="foot">NO FLUFF. JUST THE WORD AND THE WALK.</div></div>';
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
      '<button data-dev="plan">PLAN</button>'+
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
  return '<div class="pad podcast-page">'+
    '<div class="eyebrow">The Applied Word Podcast</div>'+
    '<h1 style="font-size:34px">LISTEN <em>HERE</em></h1><div class="rule" style="margin-bottom:14px"></div>'+
    '<div class="podcast-hero">'+
      '<img src="assets/podcast-cover.png" alt="The Applied Word Podcast cover" class="podcast-cover">'+
      '<div><div class="podcast-title">Sharpening the man through the Message.</div>'+
      '<p class="muted">Play the weekly devotional without leaving the app, or open the show in Spotify.</p></div>'+
    '</div>'+
    '<div id="player"><iframe src="'+EMBED_URL+'" title="The Applied Word Podcast on Spotify" loading="lazy" '+
      'allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div>'+
    '<a class="cta" href="'+SHOW_URL+'" target="_blank" rel="noopener" data-podact="open">OPEN IN SPOTIFY</a>'+
    '<a class="cta ghost" href="'+SHOW_URL+'" target="_blank" rel="noopener" data-podact="follow">FOLLOW THE SHOW</a>'+
    '<div class="where"><h4>PLAYER TROUBLE?</h4>'+
      '<p class="muted">If your browser blocks the embedded player, open the show in Spotify with the button above.</p></div>'+
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
      'He told men who fell behind to either catch up on a quiet afternoon or skip ahead — '+
      'use today for whichever you need.</p></div>';
  } else {
    var mk=function(title, idxs){
      return '<div class="stream"><h4>'+title+'</h4>'+
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
    '<div class="eyebrow">Reading plan</div>'+
    '<div class="tabsel devotion-tabs" style="margin-top:10px">'+
      '<button data-dev="today">TODAY</button>'+
      '<button class="on" data-dev="plan">PLAN</button>'+
    '</div>'+
    '<h1 style="font-size:33px;margin-top:22px">M\u2019CHEYNE</h1><div class="rule" style="margin-bottom:12px"></div>'+
    '<p class="muted">Robert Murray M\u2019Cheyne wrote this calendar for his church in Dundee in '+
      'December 1842. Four chapters a day — two to read aloud with the house, two on your own. '+
      'Finish the year and you\u2019ve read the Old Testament once, the New Testament and Psalms twice.</p>'+
    '<div class="planbar"><input type="date" id="planDate" value="'+state.planDate+'"></div>'+
    body+
    '<div class="foot">PUBLIC DOMAIN · ST. PETER\u2019S, DUNDEE, 1842</div></div>';
}

/* ============================================================
   BIBLE READER
   ============================================================ */
function bibleView(){
  if(!anyInstalled()){
    return '<div class="pad">'+
      '<div class="eyebrow">Complete offline Bible</div>'+
      '<h1 style="font-size:34px">BIBLE <em>READER</em></h1><div class="rule"></div>'+
      '<div class="bible-install">'+
        '<div class="install-crest">✦</div>'+
        '<h3>BEREAN STANDARD BIBLE</h3>'+
        '<p>The BSB text is included with the app. Download it to this device once, then the full Bible is available offline with highlights, notes, bookmarks, search, sharing, and verse cards.</p>'+
        '<div class="bar" id="bar-bsb" style="display:none"><i></i></div>'+
        '<button class="cta" data-dl="bsb">DOWNLOAD BSB</button>'+
        '<div class="tier-meta">PUBLIC DOMAIN · 66 BOOKS · STORED ON THIS DEVICE</div>'+
      '</div>'+
      '<div class="foot">THE BEREAN STANDARD BIBLE · PUBLIC DOMAIN</div></div>';
  }

  if(state.bview==="books") return bookPicker();
  if(state.bview==="chapters") return chapterPicker();
  if(state.bview==="search") return bibleSearchView();

  var verses=chapterVerses(state.book,state.chapter);
  if(!verses){
    return '<div class="pad">'+readBar()+
      '<div class="loading"><i></i>OPENING '+esc(BOOKS[state.book]).toUpperCase()+'</div></div>';
  }

  var marked=isBookmarked(state.book,state.chapter);
  var rows=verses.map(function(pair){
    var v=pair[0], text=pair[1];
    var m=markFor(state.book,state.chapter,v);
    return '<div class="v'+(state.sel&&state.sel.v===v?" sel":"")+'"'+
      (m&&m.hl?' data-hl="'+m.hl+'"':'')+' data-v="'+v+'">'+
      '<div class="v-no">'+v+'</div>'+
      '<div class="v-tx"><span class="v-tx-inner">'+esc(text)+'</span></div>'+
      (m&&m.note?'<div class="marks"><span title="note">&#9998;</span></div>':'')+
    '</div>';
  }).join("");

  return '<div class="pad">'+readBar()+
    '<div class="reader-tools">'+
      '<button data-bview="search" aria-label="Search Bible">&#9906; SEARCH</button>'+
      '<button data-font="-1" aria-label="Decrease text size">A−</button>'+
      '<button data-font="1" aria-label="Increase text size">A+</button>'+
      '<button data-mark="1" aria-label="Bookmark chapter">'+(marked?'★':'☆')+'</button>'+
    '</div>'+
    '<div class="chapter-title">'+esc(BOOKS[state.book])+' '+state.chapter+'</div>'+
    '<div class="chapter-sub">'+esc((state.meta[state.version]||{}).abbr||"BSB")+
      ' · '+verses.length+' VERSES'+(marked?' · BOOKMARKED':'')+'</div>'+
    '<div class="reader-body" style="--reader-scale:'+state.fontScale+'">'+rows+'</div>'+
    '<div class="reader-end">'+
      '<button class="cta ghost" data-step="1">NEXT CHAPTER &#8250;</button>'+
    '</div>'+
    '<div class="foot">TAP ANY VERSE TO HIGHLIGHT, NOTE, SHARE, OR MAKE A CARD</div></div>';
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
    '<div class="readbar">'+
      '<button class="nav" data-bview="read">&#8249;</button>'+
      '<div class="readbar-title">SEARCH THE BIBLE</div>'+
    '</div>'+
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
    '<button data-bview="chapters" style="flex:0 0 58px;text-align:center">'+state.chapter+'</button>'+
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
function openSheet(v){
  state.sel={b:state.book,c:state.chapter,v:v};
  var text=verseText(state.book,state.chapter,v)||"";
  var m=markFor(state.book,state.chapter,v)||{};
  $("sheetRef").textContent=refOf(state.book,state.chapter,v);
  $("sheetText").textContent=text;
  var note=$("sheetNote");
  note.value=m.note||""; note.style.display=m.note?"block":"none";
  [].forEach.call(document.querySelectorAll(".sw"),function(s){
    s.classList.toggle("on", s.dataset.c===m.hl);
  });
  $("scrim").style.display="block";
  $("sheet").style.display="block";
  render();
}
function closeSheet(){
  $("sheet").style.display="none";
  $("scrim").style.display="none";
  state.sel=null;
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
    '<div class="eyebrow">Your activity</div>'+
    '<h1 style="font-size:34px">HISTORY</h1><div class="rule" style="margin-bottom:6px"></div>'+
    '<div class="history-stats">'+
      '<div><b>'+getStreak()+'</b><span>STREAK</span></div>'+
      '<div><b>'+hlN+'</b><span>HIGHLIGHTS</span></div>'+
      '<div><b>'+noteN+'</b><span>NOTES</span></div>'+
      '<div><b>'+bookmarks().length+'</b><span>BOOKMARKS</span></div>'+
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
    return '<div class="pad">'+
      '<div class="eyebrow">Share it</div>'+
      '<h1 style="font-size:34px">VERSE <em>CARDS</em></h1><div class="rule"></div>'+
      emptyBox("PICK A VERSE FIRST",
        "Tap any verse while reading and choose Make card, or use the button on today\u2019s devotion.")+
      '</div>';
  }
  return '<div class="pad">'+
    '<div class="eyebrow">Share it</div>'+
    '<h1 style="font-size:34px">VERSE <em>CARD</em></h1><div class="rule" style="margin-bottom:4px"></div>'+
    '<div class="ratios">'+
      '<button class="'+(state.cardRatio==="9:16"?"on":"")+'" data-ratio="9:16">9:16 · STORY</button>'+
      '<button class="'+(state.cardRatio==="4:5"?"on":"")+'" data-ratio="4:5">4:5 · FEED</button>'+
      '<button class="'+(state.cardRatio==="1:1"?"on":"")+'" data-ratio="1:1">1:1 · SQUARE</button>'+
    '</div>'+
    '<div class="cardprev"><canvas id="cardCanvas"></canvas></div>'+
    '<button class="cta" data-savecard="1">SAVE TO PHOTOS</button>'+
    '<p class="muted" style="margin-top:12px;font-size:12.5px">Saves a PNG at full Instagram '+
      'resolution. On a phone this lands in your camera roll or Files, ready to post.</p>'+
    '<div class="foot">'+esc(cv.ref)+' · '+esc(cv.abbr||"BSB")+'</div></div>';
}

function drawCard(){
  var cv=state.cardVerse, cvs=$("cardCanvas");
  if(!cv||!cvs) return;
  var dim=RATIOS[state.cardRatio], W=dim[0], H=dim[1];
  cvs.width=W; cvs.height=H;
  var x=cvs.getContext("2d");
  var shortCard=H <= W*1.10;

  function roundedRect(x0,y0,w,h,r){
    x.beginPath();
    x.moveTo(x0+r,y0); x.lineTo(x0+w-r,y0);
    x.quadraticCurveTo(x0+w,y0,x0+w,y0+r);
    x.lineTo(x0+w,y0+h-r);
    x.quadraticCurveTo(x0+w,y0+h,x0+w-r,y0+h);
    x.lineTo(x0+r,y0+h);
    x.quadraticCurveTo(x0,y0+h,x0,y0+h-r);
    x.lineTo(x0,y0+r);
    x.quadraticCurveTo(x0,y0,x0+r,y0);
    x.closePath();
  }

  function seeded(i){
    var n=Math.sin(i*12.9898+78.233)*43758.5453;
    return n-Math.floor(n);
  }

  function drawMark(cx,cy,s){
    x.save();
    x.translate(cx,cy);
    x.strokeStyle="#D5B767";
    x.fillStyle="rgba(39,24,17,.42)";
    x.lineCap="round"; x.lineJoin="round";
    x.lineWidth=Math.max(2,s*.026);

    // Shield.
    x.beginPath();
    x.moveTo(-s*.43,-s*.28); x.quadraticCurveTo(0,-s*.45,s*.43,-s*.28);
    x.lineTo(s*.37,s*.20); x.quadraticCurveTo(s*.30,s*.48,0,s*.67);
    x.quadraticCurveTo(-s*.30,s*.48,-s*.37,s*.20); x.closePath();
    x.fill(); x.stroke();

    // Sword.
    x.lineWidth=Math.max(2,s*.022);
    x.beginPath(); x.moveTo(0,-s*.58); x.lineTo(0,s*.42); x.stroke();
    x.beginPath(); x.moveTo(-s*.16,-s*.24); x.lineTo(s*.16,-s*.24); x.stroke();
    x.beginPath(); x.moveTo(0,-s*.68); x.lineTo(s*.055,-s*.57); x.lineTo(0,-s*.48); x.lineTo(-s*.055,-s*.57); x.closePath(); x.stroke();

    // Open book.
    x.beginPath();
    x.moveTo(-s*.27,s*.06); x.quadraticCurveTo(-s*.14,-s*.02,-s*.02,s*.06); x.lineTo(-s*.02,s*.28); x.quadraticCurveTo(-s*.15,s*.20,-s*.27,s*.26); x.closePath();
    x.moveTo(s*.27,s*.06); x.quadraticCurveTo(s*.14,-s*.02,s*.02,s*.06); x.lineTo(s*.02,s*.28); x.quadraticCurveTo(s*.15,s*.20,s*.27,s*.26); x.closePath();
    x.stroke();

    // Compass star.
    x.beginPath();
    x.arc(0,-s*.02,s*.19,0,Math.PI*2); x.stroke();
    x.beginPath();
    x.moveTo(0,-s*.22); x.lineTo(s*.055,-s*.07); x.lineTo(s*.20,-s*.02); x.lineTo(s*.055,s*.03);
    x.lineTo(0,s*.18); x.lineTo(-s*.055,s*.03); x.lineTo(-s*.20,-s*.02); x.lineTo(-s*.055,-s*.07); x.closePath();
    x.stroke();
    x.restore();
  }

  function wrappedLines(text,maxW,size,weight,style){
    x.font=(style||"")+" "+(weight||"400")+" "+size+"px 'Lora', Georgia, serif";
    var words=String(text).trim().split(/\s+/), lines=[], line="";
    words.forEach(function(word){
      var trial=line ? line+" "+word : word;
      if(line && x.measureText(trial).width>maxW){ lines.push(line); line=word; }
      else line=trial;
    });
    if(line) lines.push(line);
    return lines;
  }

  // Smooth coffee-brown leather, closer to the podcast cover.
  x.fillStyle="#3B281F"; x.fillRect(0,0,W,H);
  var leather=x.createLinearGradient(0,0,W,H);
  leather.addColorStop(0,"rgba(118,79,55,.27)");
  leather.addColorStop(.32,"rgba(76,47,34,.08)");
  leather.addColorStop(.68,"rgba(34,22,17,.08)");
  leather.addColorStop(1,"rgba(18,12,9,.32)");
  x.fillStyle=leather; x.fillRect(0,0,W,H);

  var glow=x.createRadialGradient(W*.50,H*.38,0,W*.50,H*.38,Math.max(W,H)*.72);
  glow.addColorStop(0,"rgba(172,117,78,.18)");
  glow.addColorStop(.58,"rgba(96,59,42,.08)");
  glow.addColorStop(1,"rgba(0,0,0,0)");
  x.fillStyle=glow; x.fillRect(0,0,W,H);

  // Fine deterministic leather grain.
  for(var i=0;i<1300;i++){
    var rx=seeded(i*3)*W, ry=seeded(i*3+1)*H;
    var alpha=.012+seeded(i*3+2)*.020;
    x.fillStyle=(i%2?"rgba(255,239,210,":"rgba(15,8,5,")+alpha+")";
    x.fillRect(rx,ry,1+seeded(i+50)*3,1+seeded(i+80)*1.6);
  }

  // Vignette.
  var vign=x.createRadialGradient(W/2,H/2,Math.min(W,H)*.18,W/2,H/2,Math.max(W,H)*.78);
  vign.addColorStop(.60,"rgba(0,0,0,0)");
  vign.addColorStop(1,"rgba(11,7,5,.42)");
  x.fillStyle=vign; x.fillRect(0,0,W,H);

  var gold="#D4B566", goldLight="#E5CE8D", goldDark="#92723A";
  var outer=W*.055, inner=W*.072;

  // Embossed double border.
  roundedRect(outer,outer,W-outer*2,H-outer*2,W*.025);
  x.strokeStyle="rgba(223,193,114,.58)"; x.lineWidth=Math.max(2,W*.003); x.stroke();
  roundedRect(inner,inner,W-inner*2,H-inner*2,W*.020);
  x.strokeStyle="rgba(112,81,46,.78)"; x.lineWidth=Math.max(2,W*.0023); x.stroke();

  // Antique corner protectors.
  var cs=W*.075;
  x.fillStyle="rgba(177,139,68,.72)";
  x.beginPath(); x.moveTo(outer,outer); x.lineTo(outer+cs,outer); x.lineTo(outer,outer+cs); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(W-outer,outer); x.lineTo(W-outer-cs,outer); x.lineTo(W-outer,outer+cs); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(outer,H-outer); x.lineTo(outer+cs,H-outer); x.lineTo(outer,H-outer-cs); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(W-outer,H-outer); x.lineTo(W-outer-cs,H-outer); x.lineTo(W-outer,H-outer-cs); x.closePath(); x.fill();

  // Kicker + crest + brand.
  x.textAlign="center"; x.textBaseline="middle";
  x.fillStyle=goldLight;
  x.font="500 "+Math.round(W*.018)+"px 'JetBrains Mono', monospace";
  x.fillText("A WEEKLY DEVOTIONAL FOR MEN",W/2,H*(shortCard?.105:.075));

  var markY=H*(shortCard?.19:.155), markS=W*(shortCard?.115:.13);
  drawMark(W/2,markY,markS);

  var brandY=H*(shortCard?.29:.245);
  x.fillStyle=gold;
  x.shadowColor="rgba(18,10,7,.55)"; x.shadowBlur=W*.008; x.shadowOffsetY=W*.004;
  x.font="700 "+Math.round(W*.030)+"px 'Roboto Slab', Georgia, serif";
  x.fillText("THE APPLIED WORD PODCAST",W/2,brandY);
  x.shadowColor="transparent"; x.shadowBlur=0; x.shadowOffsetY=0;
  x.strokeStyle="rgba(212,181,102,.72)"; x.lineWidth=Math.max(2,W*.0024);
  x.beginPath(); x.moveTo(W*.26,brandY+W*.037); x.lineTo(W*.74,brandY+W*.037); x.stroke();

  // Verse block — antique gold serif, centered like the updated cover art.
  var pad=W*.13, maxW=W-pad*2;
  var size=Math.round(W*(shortCard?.052:.058));
  var maxBlock=H*(shortCard?.36:.40), lines=wrappedLines(cv.text,maxW,size,"700","");
  while(lines.length*size*1.34>maxBlock && size>Math.round(W*.031)){
    size-=Math.max(2,Math.round(W*.0028));
    lines=wrappedLines(cv.text,maxW,size,"700","");
  }
  var lineH=size*1.34, blockH=lines.length*lineH;
  var verseCenter=H*(shortCard?.56:.565), startY=verseCenter-blockH/2+lineH*.48;
  x.font="700 "+size+"px 'Lora', Georgia, serif";
  x.fillStyle=goldLight;
  x.textAlign="center";
  x.shadowColor="rgba(27,16,11,.68)"; x.shadowBlur=W*.006; x.shadowOffsetY=W*.003;
  for(var k=0;k<lines.length;k++) x.fillText(lines[k],W/2,startY+k*lineH);
  x.shadowColor="transparent"; x.shadowBlur=0; x.shadowOffsetY=0;

  // Reference and footer.
  var refY=Math.min(H*(shortCard?.805:.80), startY+blockH+W*.07);
  x.strokeStyle="rgba(212,181,102,.82)"; x.lineWidth=Math.max(2,W*.0025);
  x.beginPath(); x.moveTo(W*.33,refY-W*.035); x.lineTo(W*.67,refY-W*.035); x.stroke();
  x.fillStyle=gold;
  x.font="700 "+Math.round(W*.029)+"px 'JetBrains Mono', monospace";
  x.fillText(cv.ref.toUpperCase()+" · "+(cv.abbr||"BSB"),W/2,refY);

  x.fillStyle="rgba(229,206,141,.86)";
  x.font="italic "+Math.round(W*.025)+"px 'Lora', Georgia, serif";
  x.fillText("Sharpening the man through the Message.",W/2,H*(shortCard?.91:.91));
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

function openCardFor(b,c,v){
  var text=verseText(b,c,v);
  if(!text) return toast("Download the BSB first");
  state.cardVerse={ ref:refOf(b,c,v), text:text, abbr:(state.meta[state.version]||{}).abbr||"BSB" };
  logActivity("card",refOf(b,c,v),"Verse card");
  state.tab="card"; render();
}

/* ============================================================
   SETTINGS
   ============================================================ */
function settingsView(){
  var tier=TIERS[0], m=state.meta.bsb;
  return '<div class="pad settings-page">'+
    '<button class="backlink" data-go="'+(anyInstalled()?'bible':'devotion')+'">&#8249; BACK</button>'+
    '<div class="eyebrow">App &amp; library</div>'+
    '<h1 style="font-size:34px">SETTINGS</h1><div class="rule" style="margin-bottom:12px"></div>'+
    '<div class="grouphd" style="margin-top:6px">BIBLE LIBRARY</div>'+
    '<div class="tier">'+
      '<div class="tier-top"><div class="tier-label">BEREAN STANDARD BIBLE</div>'+
        '<div class="tier-badge'+(m?" in":"")+'">'+(m?"INSTALLED":"NOT DOWNLOADED")+'</div></div>'+
      '<div class="tier-name">Berean Standard Bible (BSB)</div>'+
      '<div class="tier-note">The public-domain text is bundled with the app. Download it once to import the complete Bible into offline storage.</div>'+
      '<div class="bar" id="bar-bsb" style="display:none"><i></i></div>'+
      (m
        ? '<div class="tier-meta">'+m.verses.toLocaleString()+' VERSE RECORDS · '+m.books+' BOOKS · '+
          '<span data-drop="bsb" style="cursor:pointer;text-decoration:underline">REMOVE LOCAL COPY</span></div>'
        : '<button class="tier-btn" data-dl="bsb">DOWNLOAD BSB</button>')+
    '</div>'+
    '<div class="grouphd" style="margin-top:30px">YOUR DATA</div>'+
    '<div class="setrow"><div><div class="lbl">Highlights, notes &amp; bookmarks</div>'+
      '<div class="sub">'+Object.keys(marks()).length+' marked verses · '+bookmarks().length+' bookmarks</div></div>'+
      '<button class="mini" data-export="1">EXPORT</button></div>'+
    '<div class="setrow"><div><div class="lbl">Activity history</div>'+
      '<div class="sub">'+activity().length+' recent actions saved on this device.</div></div>'+
      '<button class="mini" data-clearhistory="1">CLEAR</button></div>'+
    '<div class="setrow"><div><div class="lbl">Reset app data</div>'+
      '<div class="sub">Removes marks, bookmarks, activity, streaks, and the downloaded Bible copy.</div></div>'+
      '<button class="mini" data-wipe="1" style="color:var(--rust);border-color:rgba(209,169,78,.4)">RESET</button></div>'+
    '<div class="foot">PUBLIC DOMAIN BIBLE TEXT · READING DATA STAYS LOCAL</div></div>';
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
      if(!ls("version")||!state.meta[state.version]){ state.version=id; ls("version",id); }
      logActivity("download","Berean Standard Bible",meta.books+" books");
      state.tab="bible"; state.bview="read";
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
  {id:"history", label:"HISTORY"}
];

function screenHTML(){
  switch(state.tab){
    case "devotion": return devotionView();
    case "podcast":  return podcastView();
    case "bible":    return bibleView();
    case "history":  return historyView();
    case "card":     return cardView();
    case "settings": return settingsView();
    default:         return devotionView();
  }
}

function render(){
  var scr=$("screen");
  var keepScroll=(state.tab==="bible" && state.bview==="read") ? scr.scrollTop : 0;
  scr.innerHTML=screenHTML();
  scr.scrollTop=keepScroll;

  $("streakN").textContent=getStreak();

  [].forEach.call(document.querySelectorAll("nav button"),function(b){
    var on = b.dataset.tab===state.tab ||
             (state.tab==="card" && b.dataset.tab==="bible") ||
             (state.tab==="settings" && b.dataset.tab==="bible");
    b.classList.toggle("on", on);
  });

  wire(scr);
  if(state.tab==="card") drawCard();
}

function on(root, sel, fn){
  [].forEach.call(root.querySelectorAll(sel), fn);
}

function wire(scr){
  var w=$("walkBtn");
  if(w) w.onclick=function(){ markWalk(); render(); };

  on(scr,"[data-go]",function(b){
    b.onclick=function(){ state.tab=b.dataset.go; render(); };
  });
  on(scr,"[data-dev]",function(b){
    b.onclick=function(){
      state.devMode=b.dataset.dev;
      if(state.devMode==="spurgeon" && !state.spData) loadSpurgeon(); else render();
    };
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
    b.onclick=function(){ openSheet(+b.dataset.v); };
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

  // History
  on(scr,"[data-history]",function(b){
    b.onclick=function(){ state.historyTab=b.dataset.history; render(); };
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
        state.version="bsb"; ls("version","bsb");
        toast("Local Bible copy removed"); render();
      });
    };
  });
  on(scr,"[data-export]",function(b){
    b.onclick=function(){
      var data={ marks:marks(), bookmarks:bookmarks(), activity:activity(), exported:new Date().toISOString() };
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
        jset("marks",{}); jset("bookmarks",[]); jset("plandone",{}); jset("activity",[]);
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

function initSheet(){
  $("scrim").onclick=closeSheet;
  $("sheetClose").onclick=closeSheet;

  [].forEach.call(document.querySelectorAll(".sw"),function(s){
    s.onclick=function(){
      if(!state.sel) return;
      var c=s.dataset.c||null;
      var cur=markFor(state.sel.b,state.sel.c,state.sel.v);
      var next=(cur&&cur.hl===c)?null:c;
      setMark(state.sel.b,state.sel.c,state.sel.v,{hl:next});
      if(next) logActivity("highlight",refOf(state.sel.b,state.sel.c,state.sel.v),next+" highlight");
      [].forEach.call(document.querySelectorAll(".sw"),function(o){
        o.classList.toggle("on", !!next && o.dataset.c===next);
      });
      render();
    };
  });

  $("sheetNoteBtn").onclick=function(){
    var n=$("sheetNote");
    n.style.display = n.style.display==="block" ? "none" : "block";
    if(n.style.display==="block") n.focus();
  };
  $("sheetNote").onblur=function(){
    if(!state.sel) return;
    var s=state.sel, val=$("sheetNote").value.trim();
    setMark(s.b,s.c,s.v,{note:val||null});
    if(val) logActivity("note",refOf(s.b,s.c,s.v),"Bible note");
    render();
  };
  $("sheetShareBtn").onclick=function(){
    if(!state.sel) return;
    var s=state.sel;
    shareVerse(s.b,s.c,s.v);
  };
  $("sheetCardBtn").onclick=function(){
    if(!state.sel) return;
    var s=state.sel; closeSheet(); openCardFor(s.b,s.c,s.v);
  };
  $("sheetCopyBtn").onclick=function(){
    if(!state.sel) return;
    var s=state.sel;
    var t=verseText(s.b,s.c,s.v);
    var out='“'+t+'” — '+refOf(s.b,s.c,s.v)+" ("+((state.meta[state.version]||{}).abbr||"BSB")+")";
    if(navigator.clipboard) navigator.clipboard.writeText(out).then(function(){ toast("Copied"); });
    else toast("Copy isn't available here");
  };
}

/* ---------- boot ---------- */
[].forEach.call(document.querySelectorAll("nav button"),function(b){
  b.onclick=function(){
    state.tab=b.dataset.tab;
    if(state.tab==="bible") state.bview="read";
    if(state.tab==="podcast") logActivity("podcast","The Applied Word Podcast","Podcast tab");
    render();
  };
});

var settingsBtn=$("settingsBtn");
if(settingsBtn) settingsBtn.onclick=function(){ state.tab="settings"; render(); };

initSheet();

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

/* ---------- offline shell ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  });
}
