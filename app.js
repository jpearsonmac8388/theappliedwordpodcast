/* ============================================================
   THE APPLIED WORD — app
   ============================================================ */

var SHOW_URL  = "https://open.spotify.com/show/75QaXUSGooCOG8oqKhuNmG";
var EMBED_URL = "https://open.spotify.com/embed/show/75QaXUSGooCOG8oqKhuNmG?utm_source=generator&theme=0";

/* ---------- visual assets ---------- */
var DEVOTIONAL_IMAGES = [
  "assets/devotional/01-suffer-the-children.jpg",
  "assets/devotional/02-sermon-on-the-mount.jpg",
  "assets/devotional/03-woman-at-well.jpg",
  "assets/devotional/04-christ-and-child.jpg",
  "assets/devotional/05-wedding-at-cana.jpg",
  "assets/devotional/06-healing-blind-man.jpg",
  "assets/devotional/07-jesus-in-temple.jpg",
  "assets/devotional/08-resurrection.jpg",
  "assets/devotional/09-transfiguration.jpg",
  "assets/devotional/10-consolator.jpg"
];
var devCarouselTimer = null;
var devCarouselIndex = 0;
var cardLogo = null;

/* ---------- small helpers ---------- */
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
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
  bview: "read",                   // read | books | chapters
  loaded: {},                      // versionId -> {book:{chap:{v:text}}}
  meta: {},                        // versionId -> meta
  sel: null,                       // {b,c,v} single-verse action sheet
  selectMode: false,               // multi-verse selection mode
  multiSel: [],                    // verse numbers in current chapter
  listTab: "highlights",
  // devotion
  devMode: "today",                // today | spurgeon
  spDate: stampOf(new Date()),
  spHalf: "morning",
  spData: null, spState: "idle",
  // plans
  planDate: stampOf(new Date()),
  // card / appearance
  cardRatio: "9:16", cardVerse: null,
  theme: ls("theme") || "coffee"
};

function applyTheme(theme){
  var allowed={coffee:1,midnight:1,slate:1};
  theme=allowed[theme]?theme:"coffee";
  state.theme=theme;
  ls("theme",theme);
  document.body.setAttribute("data-theme",theme);
  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta){
    meta.setAttribute("content", theme==="midnight" ? "#0D1726" : theme==="slate" ? "#20272E" : "#1E140C");
  }
}

function clearVerseSelection(){
  state.sel=null;
  state.selectMode=false;
  state.multiSel=[];
}

function selectedVerseNumbers(){
  return state.multiSel.slice().sort(function(a,b){ return a-b; });
}

function selectionRef(b,c,vs){
  vs=vs.slice().sort(function(a,b){return a-b;});
  if(!vs.length) return refOf(b,c);
  var contiguous=true;
  for(var i=1;i<vs.length;i++) if(vs[i]!==vs[i-1]+1){ contiguous=false; break; }
  if(vs.length===1) return refOf(b,c,vs[0]);
  if(contiguous) return BOOKS[b]+" "+c+":"+vs[0]+"–"+vs[vs.length-1];
  return BOOKS[b]+" "+c+":"+vs.join(", ");
}

function cardForVerses(b,c,vs){
  vs=vs.slice().sort(function(a,b){return a-b;});
  if(!vs.length) return toast("Select at least one verse");
  var parts=[];
  vs.forEach(function(v){
    var t=verseText(b,c,v);
    if(t) parts.push((vs.length>1 ? v+"  " : "")+t);
  });
  if(!parts.length) return toast("Download a translation first");
  state.cardVerse={
    ref:selectionRef(b,c,vs),
    text:parts.join("  "),
    abbr:(state.meta[state.version]||{}).abbr||"BSB"
  };
  clearVerseSelection();
  state.tab="card";
  render();
}

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
  var d=today(), n=dayOfYear(d);
  var dev=DEVOTIONS[(n-1) % DEVOTIONS.length];
  var done=walkedToday();
  var first=(n-1)%DEVOTIONAL_IMAGES.length;
  var second=(first+1)%DEVOTIONAL_IMAGES.length;

  return '<div class="pad">'+
    '<div class="dev-card">'+
      '<div class="dev-hero" data-devhero="1">'+
        '<img class="dev-photo active" data-layer="0" src="'+DEVOTIONAL_IMAGES[first]+'" alt="Biblical artwork featuring Jesus" decoding="async">'+
        '<img class="dev-photo" data-layer="1" src="'+DEVOTIONAL_IMAGES[second]+'" alt="" decoding="async">'+
        '<div class="dev-shade"></div>'+
      '</div>'+
      '<div class="dev-card-body">'+
        '<div class="datestrip"><div class="daynum">'+n+'</div><div class="daymeta">'+
          d.toLocaleDateString("en-US",{weekday:"long"}).toUpperCase()+" · "+
          d.toLocaleDateString("en-US",{month:"long",day:"numeric"}).toUpperCase()+
          "<br>TODAY'S WORD</div></div>"+
        '<h1>'+esc(dev.title[0])+'<br><em>'+esc(dev.title[1])+'</em></h1>'+
        '<div class="rule"></div>'+
        '<div class="bracket"><p class="verse">'+esc(dev.verse)+'</p>'+
          '<div class="ref" style="margin-top:14px">'+esc(dev.ref)+' · BSB</div></div>'+
      '</div>'+
    '</div>'+

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

function stopDevotionalCarousel(){
  if(devCarouselTimer){ clearInterval(devCarouselTimer); devCarouselTimer=null; }
}

function startDevotionalCarousel(){
  stopDevotionalCarousel();
  var hero=document.querySelector('[data-devhero="1"]');
  if(!hero || DEVOTIONAL_IMAGES.length<2) return;
  var layers=hero.querySelectorAll('.dev-photo');
  if(layers.length<2) return;
  devCarouselIndex=(dayOfYear(today())-1)%DEVOTIONAL_IMAGES.length;
  var active=0;
  var failed={};

  function advance(){
    if(document.hidden) return;
    var tries=0;
    function tryNext(){
      if(tries>=DEVOTIONAL_IMAGES.length) return;
      tries++;
      devCarouselIndex=(devCarouselIndex+1)%DEVOTIONAL_IMAGES.length;
      if(failed[devCarouselIndex]) return tryNext();
      var next=active?0:1;
      var preload=new Image();
      preload.decoding="async";
      preload.onload=function(){
        layers[next].src=DEVOTIONAL_IMAGES[devCarouselIndex];
        layers[next].classList.add("active");
        layers[active].classList.remove("active");
        active=next;
      };
      preload.onerror=function(){ failed[devCarouselIndex]=1; tryNext(); };
      preload.src=DEVOTIONAL_IMAGES[devCarouselIndex];
    }
    tryNext();
  }

  devCarouselTimer=setInterval(advance,9000);
}

/* ---------- Spurgeon, fetched live per date ---------- */
function spurgeonView(){
  var parts=state.spDate.split("-");
  var mo=+parts[1], dy=+parts[2];

  var body;
  if(state.spState==="loading"){
    body='<div class="loading"><i></i>OPENING SPURGEON</div>';
  } else if(state.spState==="error"){
    body='<div class="empty"><h4>COULDN\'T REACH THE LIBRARY</h4>'+
      '<p>This reads live from the Christian Classics Ethereal Library, which needs a deployed '+
      'site with the proxy function in place — plain static hosting alone can\'t make this '+
      'particular request (see the README for what that means for your host).</p>'+
      '<a class="cta ghost" style="max-width:260px;margin:16px auto 0" target="_blank" rel="noopener" href="'+
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

    '<div class="tabsel">'+
      '<button data-dev="today">TODAY</button>'+
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

function loadSpurgeon(){
  var p=state.spDate.split("-"), mo=+p[1], dy=+p[2];
  state.spState="loading"; state.spData=null; render();

  fetch(SPURGEON.page(mo,dy,state.spHalf))
    .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.text(); })
    .then(function(html){
      var parsed=parseSpurgeon(html);
      if(!parsed.paras.length) throw new Error("nothing parsed");
      state.spData=parsed; state.spState="ready"; render();
    })
    .catch(function(){ state.spState="error"; render(); });
}

/* Pulls the verse, reference and body out of a CCEL reading page. */
function parseSpurgeon(html){
  var doc=new DOMParser().parseFromString(html,"text/html");

  var verse="", ref="";
  var i=doc.querySelector(".Scripture, .scripture, i, em");
  if(i) verse=i.textContent.replace(/\s+/g," ").replace(/^[“"']|[”"']$/g,"").trim();

  var h=doc.querySelector("h3, h4");
  if(h) ref=h.textContent.replace(/\s+/g," ").trim();

  var paras=[];
  var ps=doc.querySelectorAll("p");
  for(var k=0;k<ps.length;k++){
    var t=ps[k].textContent.replace(/\s+/g," ").trim();
    if(t.length<60) continue;
    if(/please\s+login|VIEWNAME|Christian Classics/i.test(t)) continue;
    if(verse && t.indexOf(verse.slice(0,40))===0) continue;
    paras.push(t);
  }
  return { verse:verse, ref:ref, paras:paras };
}

/* ============================================================
   PODCAST
   ============================================================ */
function podcastView(){
  return '<div class="pad">'+
    '<div class="eyebrow">The weekly episode</div>'+
    '<h1 style="font-size:34px">LISTEN <em>IN</em></h1><div class="rule" style="margin-bottom:12px"></div>'+
    '<p class="muted">A weekly devotional for men, hosted by Justin McFadden. Every episode plays '+
      'right here — no account needed.</p>'+
    '<div id="player"><iframe src="'+EMBED_URL+'" title="The Applied Word on Spotify" loading="lazy" '+
      'allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div>'+
    '<a class="cta" href="'+SHOW_URL+'" target="_blank" rel="noopener">OPEN IN SPOTIFY</a>'+
    '<div class="where listen-anywhere"><h4>LISTEN ANYWHERE</h4>'+
      '<p class="muted">Use the Spotify button above to listen in the Spotify app or browser.</p>'+
      '<h4 style="margin-top:18px">IF THE PLAYER DOESN\'T LOAD</h4>'+
      '<p class="muted">Some browsers block embedded players. The button above opens the show '+
      'directly in Spotify, where every episode lives.</p></div>'+
    '<div class="foot">SHARPENING THE MAN THROUGH THE MESSAGE</div></div>';
}

/* ============================================================
   READING PLANS — M'Cheyne
   ============================================================ */
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
    '<h1 style="font-size:33px">M\u2019CHEYNE</h1><div class="rule" style="margin-bottom:12px"></div>'+
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
      '<div class="eyebrow">Read it yourself</div>'+
      '<h1 style="font-size:34px">THE <em>TEXT</em></h1><div class="rule"></div>'+
      '<div class="empty"><h4>NO TRANSLATION YET</h4>'+
      '<p>Head to Settings and tap Download on a tier. It pulls the real text from the Berean '+
      'Bible and sets it up to read here — chapters, highlighting, notes, the lot.</p>'+
      '<button class="cta" style="max-width:250px;margin:16px auto 0" data-go="settings">'+
      'OPEN SETTINGS</button></div></div>';
  }

  if(state.bview==="books") return bookPicker();
  if(state.bview==="chapters") return chapterPicker();

  var verses=chapterVerses(state.book,state.chapter);
  if(!verses){
    return '<div class="pad">'+readBar()+
      '<div class="loading"><i></i>OPENING '+esc(BOOKS[state.book]).toUpperCase()+'</div></div>';
  }

  var marked=isBookmarked(state.book,state.chapter);
  var rows=verses.map(function(pair){
    var v=pair[0], text=pair[1];
    var m=markFor(state.book,state.chapter,v);
    var picked=state.multiSel.indexOf(v)>-1;
    return '<div class="v'+((state.sel&&state.sel.v===v)||picked?" sel":"")+(picked?" multi-picked":"")+'"'+
      (m&&m.hl?' data-hl="'+m.hl+'"':'')+' data-v="'+v+'">'+
      '<div class="v-no">'+v+'</div>'+
      '<div class="v-tx"><span class="v-ink">'+esc(text)+'</span></div>'+
      (m&&m.note?'<div class="marks"><span title="note">&#9998;</span></div>':'')+
    '</div>';
  }).join("");

  return '<div class="pad">'+readBar()+
    (state.selectMode?multiSelectionBar():'')+
    '<div class="chapter-title">'+esc(BOOKS[state.book])+' '+state.chapter+'</div>'+
    '<div class="chapter-sub">'+esc((state.meta[state.version]||{}).abbr||"")+
      ' · '+verses.length+' VERSES'+(marked?' · BOOKMARKED':'')+'</div>'+
    rows+
    '<div style="display:flex;gap:9px;margin-top:26px">'+
      '<button class="cta ghost" style="margin-top:0" data-mark="1">'+
        (marked?'&#9733; BOOKMARKED':'&#9734; BOOKMARK THIS CHAPTER')+'</button></div>'+
    '<div class="foot">TAP A VERSE FOR ACTIONS · USE SELECT MORE FOR MULTIPLE VERSES</div></div>';
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
  state.book=b; state.chapter=c; clearVerseSelection();
  ls("book",b); ls("chapter",c);
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

function multiSelectionBar(){
  var n=state.multiSel.length;
  return '<div class="multi-select-bar">'+
    '<div class="multi-title"><strong>'+n+'</strong> VERSE'+(n===1?'':'S')+' SELECTED <span>Tap verses to add or remove</span></div>'+
    '<div class="multi-swatches" aria-label="Highlight selected verses">'+
      '<button data-multihl="gold" title="Gold highlight"></button>'+
      '<button data-multihl="rust" title="Rust highlight"></button>'+
      '<button data-multihl="green" title="Green highlight"></button>'+
      '<button data-multihl="blue" title="Blue highlight"></button>'+
      '<button data-multihl="violet" title="Violet highlight"></button>'+
      '<button class="clear" data-multihl="" title="Remove highlight">∅</button>'+
    '</div>'+
    '<div class="multi-actions">'+
      '<button data-multicard="1"'+(n?'':' disabled')+'>MAKE CARD</button>'+
      '<button data-multidone="1">DONE</button>'+
    '</div>'+
  '</div>';
}

function toggleMultiVerse(v){
  var i=state.multiSel.indexOf(v);
  if(i>-1) state.multiSel.splice(i,1); else state.multiSel.push(v);
  state.multiSel.sort(function(a,b){return a-b;});
}

function enterMultiSelect(v){
  state.selectMode=true;
  state.multiSel=[v];
  state.sel=null;
  $("sheet").style.display="none";
  $("scrim").style.display="none";
  render();
}

function applyMultiHighlight(color){
  if(!state.multiSel.length) return;
  state.multiSel.forEach(function(v){ setMark(state.book,state.chapter,v,{hl:color||null}); });
  toast(color ? state.multiSel.length+" verses highlighted" : "Highlight removed");
  render();
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
      '<button class="'+(state.cardRatio==="9:16"?"on":"")+'" data-ratio="9:16">9:16</button>'+
      '<button class="'+(state.cardRatio==="4:5"?"on":"")+'" data-ratio="4:5">4:5</button>'+
      '<button class="'+(state.cardRatio==="1:1"?"on":"")+'" data-ratio="1:1">1:1</button>'+
    '</div>'+
    '<div class="cardprev"><canvas id="cardCanvas"></canvas></div>'+
    '<button class="cta" data-savecard="1">SAVE TO PHOTOS</button>'+
    '<p class="muted" style="margin-top:12px;font-size:12.5px">Saves a PNG at full Instagram '+
      'resolution. On a phone this lands in your camera roll or Files, ready to post.</p>'+
    '<div class="foot">'+esc(cv.ref)+' · '+esc(cv.abbr||"BSB")+'</div></div>';
}

function seededNoise(seed){
  seed=(seed>>>0)||1;
  return function(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
}

function wrapCanvasText(ctx,text,maxW,fontPx,fontFamily){
  ctx.font="700 "+fontPx+"px "+fontFamily;
  var words=String(text).split(/\s+/), lines=[], line="";
  for(var i=0;i<words.length;i++){
    var next=line?line+" "+words[i]:words[i];
    if(line && ctx.measureText(next).width>maxW){ lines.push(line); line=words[i]; }
    else line=next;
  }
  if(line) lines.push(line);
  return lines;
}

function fitCanvasText(ctx,text,maxW,maxH,startPx,minPx,lineFactor,fontFamily){
  var size=startPx, lines=[];
  // Keep shrinking for longer multi-verse passages instead of letting text
  // overflow the safe area. minPx is the preferred floor; 12px is the hard floor.
  var hardFloor=Math.max(12,Math.round(minPx*.62));
  while(true){
    lines=wrapCanvasText(ctx,text,maxW,size,fontFamily);
    if(lines.length*size*lineFactor<=maxH || size<=hardFloor) break;
    size-=2;
  }
  return {size:size,lines:lines,lineH:size*lineFactor};
}

function drawCircularLogo(ctx,W,H,cx,cy,r,after){
  function fallback(){
    ctx.save();
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();
    var g=ctx.createRadialGradient(cx,cy-r*.2,0,cx,cy,r);
    g.addColorStop(0,"#5A3A27"); g.addColorStop(1,"#21140D");
    ctx.fillStyle=g; ctx.fillRect(cx-r,cy-r,r*2,r*2);
    ctx.strokeStyle="#D8B763"; ctx.lineWidth=Math.max(3,W*.004);
    ctx.strokeRect(cx-r*.45,cy-r*.22,r*.9,r*.55);
    ctx.restore();
    after();
  }
  if(cardLogo && cardLogo.complete && cardLogo.naturalWidth){
    ctx.save();
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();
    var sw=cardLogo.naturalWidth, sh=cardLogo.naturalHeight;
    // Source-crop the central emblem so the circular logo never includes the
    // square icon's wordmark or changes framing when the card ratio changes.
    var crop=Math.min(sw,sh)*.62;
    var sx=(sw-crop)/2;
    var sy=Math.min(sh-crop,sh*.18);
    ctx.drawImage(cardLogo,sx,sy,crop,crop,cx-r,cy-r,r*2,r*2);
    ctx.restore();
    ctx.strokeStyle="#D8B763"; ctx.lineWidth=Math.max(3,W*.004);
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
    after();
    return;
  }
  if(!cardLogo){
    cardLogo=new Image();
    cardLogo.onload=function(){ if(state.tab==="card") drawCard(); };
    cardLogo.onerror=function(){};
    cardLogo.src="icons/icon-512.png";
  }
  fallback();
}

function drawCard(){
  var cv=state.cardVerse, cvs=$("cardCanvas");
  if(!cv||!cvs) return;
  var dim=RATIOS[state.cardRatio]||RATIOS["9:16"], W=dim[0], H=dim[1];
  cvs.width=W; cvs.height=H;
  cvs.style.aspectRatio=W+" / "+H;
  var x=cvs.getContext("2d");
  var shortSide=Math.min(W,H);

  // Smooth coffee-brown leather: subtle deterministic grain so redraws do not flicker.
  var bg=x.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,"#2A1B13"); bg.addColorStop(.45,"#4A3020"); bg.addColorStop(1,"#21140E");
  x.fillStyle=bg; x.fillRect(0,0,W,H);
  var rnd=seededNoise((cv.ref.length*2654435761)>>>0);
  for(var i=0;i<850;i++){
    var px=rnd()*W, py=rnd()*H, a=.012+rnd()*.018;
    x.fillStyle="rgba(255,235,190,"+a+")";
    x.fillRect(px,py,1+rnd()*2,1+rnd()*1.5);
  }
  var vign=x.createRadialGradient(W/2,H*.46,shortSide*.1,W/2,H*.46,Math.max(W,H)*.72);
  vign.addColorStop(0,"rgba(255,219,154,.035)");
  vign.addColorStop(1,"rgba(0,0,0,.42)");
  x.fillStyle=vign; x.fillRect(0,0,W,H);

  var gold="#D8B763", bright="#E5C97B", cream="#F2E4C5";
  var edge=Math.round(shortSide*.055);
  x.strokeStyle=gold; x.lineWidth=Math.max(3,shortSide*.0045);
  x.strokeRect(edge,edge,W-edge*2,H-edge*2);
  x.strokeStyle="rgba(216,183,99,.38)"; x.lineWidth=Math.max(2,shortSide*.002);
  x.strokeRect(edge+shortSide*.018,edge+shortSide*.018,W-(edge+shortSide*.018)*2,H-(edge+shortSide*.018)*2);

  // Every position is recomputed from the active canvas ratio.
  var logoR=Math.round(shortSide*(H/W>1.45?.072:.064));
  var logoY=Math.round(H*(H/W>1.45?.12:.105));
  drawCircularLogo(x,W,H,W/2,logoY,logoR,function(){
    x.textAlign="center"; x.textBaseline="middle";
    x.fillStyle=bright;
    var brandPx=Math.round(shortSide*(H/W>1.45?.027:.023));
    x.font="700 "+brandPx+"px 'JetBrains Mono', monospace";
    x.fillText("THE APPLIED WORD PODCAST",W/2,logoY+logoR+brandPx*1.5);

    var textTop=Math.round(H*(H/W>1.45?.265:.24));
    var refBase=Math.round(H*(H/W>1.45?.79:.82));
    var safeX=Math.round(W*.115);
    var maxW=W-safeX*2;
    var maxH=refBase-textTop-Math.round(shortSide*.10);
    var startSize=Math.round(shortSide*(cv.text.length>420?.055:cv.text.length>240?.063:.071));
    if(H/W<1.2) startSize=Math.round(startSize*.88);
    var fit=fitCanvasText(x,cv.text,maxW,maxH,startSize,Math.round(shortSide*.020),1.25,"Georgia, 'Times New Roman', serif");
    var blockH=fit.lines.length*fit.lineH;
    var centerY=textTop+maxH/2;
    var y=centerY-blockH/2+fit.lineH/2;

    x.fillStyle=cream;
    x.font="700 "+fit.size+"px Georgia, 'Times New Roman', serif";
    x.textAlign="center";
    for(var j=0;j<fit.lines.length;j++) x.fillText(fit.lines[j],W/2,y+j*fit.lineH);

    var ruleY=Math.min(refBase-Math.round(shortSide*.07), y+(fit.lines.length-1)*fit.lineH+fit.lineH*.9);
    x.strokeStyle=gold; x.lineWidth=Math.max(3,shortSide*.004);
    x.beginPath(); x.moveTo(W*.36,ruleY); x.lineTo(W*.64,ruleY); x.stroke();

    x.fillStyle=bright;
    var refText=cv.ref.toUpperCase()+"  ·  "+(cv.abbr||"BSB");
    var refPx=Math.round(shortSide*(cv.ref.length>28?.025:.03));
    x.font="700 "+refPx+"px 'JetBrains Mono', monospace";
    while(refPx>Math.round(shortSide*.017) && x.measureText(refText).width>maxW){
      refPx-=1; x.font="700 "+refPx+"px 'JetBrains Mono', monospace";
    }
    x.fillText(refText,W/2,ruleY+refPx*1.8);

    x.fillStyle="rgba(229,201,123,.72)";
    var footText="SHARPENING THE MAN THROUGH THE MESSAGE";
    var footPx=Math.round(shortSide*.0185);
    x.font="700 "+footPx+"px 'JetBrains Mono', monospace";
    while(footPx>Math.round(shortSide*.012) && x.measureText(footText).width>W-edge*3){
      footPx-=1; x.font="700 "+footPx+"px 'JetBrains Mono', monospace";
    }
    x.fillText(footText,W/2,H-edge-shortSide*.035);
  });
}

function saveCard(){
  var cvs=$("cardCanvas"); if(!cvs) return;
  cvs.toBlob(function(blob){
    if(!blob) return toast("Couldn't build the image");
    var name="applied-word-"+state.cardVerse.ref.replace(/[^\w]+/g,"-").toLowerCase()+
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
  cardForVerses(b,c,[v]);
}

/* ============================================================
   SETTINGS
   ============================================================ */
function settingsView(){
  var cards=TIERS.map(function(t){
    if(!t.available){
      return '<div class="tier off">'+
        '<div class="tier-top"><div class="tier-label">'+esc(t.label)+'</div>'+
          '<div class="tier-badge">NOT AVAILABLE</div></div>'+
        '<div class="tier-name">'+esc(t.name)+' ('+esc(t.abbr)+')</div>'+
        '<div class="tier-note">'+esc(t.note)+'</div>'+
        '<div class="tier-why">'+esc(t.why)+'</div>'+
        '<a class="tier-btn ghost" href="'+t.link+'" target="_blank" rel="noopener" '+
          'style="text-decoration:none">VISIT '+esc(t.origin).toUpperCase()+'</a></div>';
    }
    var m=state.meta[t.id];
    var active=state.version===t.id;
    return '<div class="tier">'+
      '<div class="tier-top"><div class="tier-label">'+esc(t.label)+'</div>'+
        '<div class="tier-badge'+(m?" in":"")+'">'+(m?"INSTALLED":"NOT DOWNLOADED")+'</div></div>'+
      '<div class="tier-name">'+esc(t.name)+' ('+esc(t.abbr)+')</div>'+
      '<div class="tier-note">'+esc(t.note)+'</div>'+
      '<div class="bar" id="bar-'+t.id+'" style="display:none"><i></i></div>'+
      (m
        ? '<button class="tier-btn '+(active?"done":"ghost")+'" data-use="'+t.id+'">'+
            (active?'&#10003; READING THIS':'READ THIS ONE')+'</button>'+
          '<div class="tier-meta">'+m.verses.toLocaleString()+' VERSES · '+m.books+' BOOKS'+
          ' · <span data-drop="'+t.id+'" style="cursor:pointer;text-decoration:underline">REMOVE</span></div>'
        : '<button class="tier-btn" data-dl="'+t.id+'">DOWNLOAD</button>'+
          '<div class="tier-meta">FROM '+esc(t.origin).toUpperCase()+'</div>')+
    '</div>';
  }).join("");

  return '<div class="pad">'+
    '<div class="eyebrow">Setup</div>'+
    '<h1 style="font-size:34px">SETTINGS</h1><div class="rule" style="margin-bottom:12px"></div>'+

    '<div class="grouphd" style="margin-top:6px">APPEARANCE</div>'+
    '<div class="theme-grid">'+
      '<button class="theme-choice '+(state.theme==="coffee"?'on':'')+'" data-theme="coffee"><i class="theme-dot coffee"></i><span>COFFEE</span></button>'+
      '<button class="theme-choice '+(state.theme==="midnight"?'on':'')+'" data-theme="midnight"><i class="theme-dot midnight"></i><span>MIDNIGHT</span></button>'+
      '<button class="theme-choice '+(state.theme==="slate"?'on':'')+'" data-theme="slate"><i class="theme-dot slate"></i><span>SLATE</span></button>'+
    '</div>'+

    '<div class="grouphd" style="margin-top:24px">BIBLE LIBRARY</div>'+
    '<p class="muted" style="font-size:13px">The Berean Bible was placed in the public domain in '+
      'April 2023 — free to download, read, and keep, with no key and no fee. Tap Download and the '+
      'app pulls the real text and sets it up to read.</p>'+
    cards+

    '<div class="grouphd" style="margin-top:30px">YOUR MARKS</div>'+
    '<div class="setrow"><div><div class="lbl">Highlights &amp; notes</div>'+
      '<div class="sub">'+Object.keys(marks()).length+' verses marked · '+
      bookmarks().length+' bookmarks</div></div>'+
      '<button class="mini" data-export="1">EXPORT</button></div>'+
    '<div class="setrow"><div><div class="lbl">Clear everything</div>'+
      '<div class="sub">Removes all highlights, notes, bookmarks and downloads on this device.</div></div>'+
      '<button class="mini" data-wipe="1" style="color:var(--rust);border-color:rgba(209,169,78,.4)">RESET</button></div>'+

    '<div class="foot">PUBLIC DOMAIN TEXT · NOTHING LEAVES YOUR PHONE</div></div>';
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
      toast(meta.abbr+" ready · "+meta.verses.toLocaleString()+" verses");
      render();
    });
  })
  .catch(function(err){
    if(bar) bar.style.display="none";
    if(btn){ btn.disabled=false; btn.textContent="DOWNLOAD"; }
    toast(/Failed|NetworkError|HTTP/.test(String(err.message))
      ? "Download needs the proxy function — see the README"
      : "Download failed — try again");
  });
}

/* ============================================================
   RENDER + WIRING
   ============================================================ */
var TABS=[
  {id:"devotion", label:"DEVOTION", icon:"\u2726"},
  {id:"bible",    label:"BIBLE",    icon:"\u25A4"},
  {id:"plans",    label:"Reading Plan", icon:"\u2637"},
  {id:"marks",    label:"MARGIN",   icon:"\u270E"},
  {id:"settings", label:"SETTINGS", icon:"\u2699"}
];

function screenHTML(){
  switch(state.tab){
    case "devotion": return devotionView();
    case "bible":    return bibleView();
    case "plans":    return plansView();
    case "marks":    return listView();
    case "card":     return cardView();
    case "podcast":  return podcastView();
    default:         return settingsView();
  }
}

function render(){
  stopDevotionalCarousel();
  var scr=$("screen");
  var keepScroll=(state.tab==="bible" && state.bview==="read") ? scr.scrollTop : 0;
  scr.innerHTML=screenHTML();
  scr.scrollTop=keepScroll;

  $("streakN").textContent=getStreak();

  [].forEach.call(document.querySelectorAll("nav button"),function(b){
    var on = b.dataset.tab===state.tab ||
             (state.tab==="card" && b.dataset.tab==="bible") ||
             (state.tab==="podcast" && b.dataset.tab==="devotion");
    b.classList.toggle("on", on);
  });

  wire(scr);
  if(state.tab==="card") drawCard();
  if(state.tab==="devotion" && state.devMode==="today") startDevotionalCarousel();
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

  var pd=$("planDate");
  if(pd) pd.onchange=function(){ state.planDate=pd.value; render(); };
  on(scr,"[data-plan]",function(b){
    b.onclick=function(e){
      if(e.target.closest("[data-planopen]")) return;
      togglePlanReading(state.planDate, +b.dataset.plan); render();
    };
  });
  on(scr,"[data-planopen]",function(b){
    b.onclick=function(e){ e.stopPropagation(); openRef(b.dataset.planopen); };
  });

  // bible navigation
  on(scr,"[data-bview]",function(b){
    b.onclick=function(){ state.bview=b.dataset.bview; clearVerseSelection(); render(); };
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
      state.chapter=+b.dataset.chap; state.bview="read"; clearVerseSelection();
      ls("chapter",state.chapter); render();
    };
  });
  on(scr,"[data-v]",function(b){
    b.onclick=function(){
      var v=+b.dataset.v;
      if(state.selectMode){ toggleMultiVerse(v); render(); }
      else openSheet(v);
    };
  });
  on(scr,"[data-multihl]",function(b){
    b.onclick=function(e){ e.stopPropagation(); applyMultiHighlight(b.dataset.multihl||null); };
  });
  on(scr,"[data-multicard]",function(b){
    b.onclick=function(){ cardForVerses(state.book,state.chapter,selectedVerseNumbers()); };
  });
  on(scr,"[data-multidone]",function(b){
    b.onclick=function(){ clearVerseSelection(); render(); };
  });
  on(scr,"[data-mark]",function(b){
    b.onclick=function(){
      var added=toggleBookmark(state.book,state.chapter);
      toast(added?"Bookmarked":"Bookmark removed"); render();
    };
  });
  on(scr,"[data-jump]",function(b){
    b.onclick=function(){
      var p=b.dataset.jump.split(":");
      state.book=+p[0]; state.chapter=+p[1];
      state.tab="bible"; state.bview="read"; clearVerseSelection();
      ls("book",state.book); ls("chapter",state.chapter);
      render();
    };
  });
  on(scr,"[data-list]",function(b){
    b.onclick=function(){ state.listTab=b.dataset.list; render(); };
  });

  // cards
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
      state.tab="card"; render();
    };
  });
  on(scr,"[data-openref]",function(b){
    b.onclick=function(){ openRef(b.dataset.openref); };
  });

  // settings
  on(scr,"[data-theme]",function(b){
    b.onclick=function(){ applyTheme(b.dataset.theme); render(); toast("Theme updated"); };
  });
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
          var left=Object.keys(state.meta);
          state.version=left[0]||"bsb"; ls("version",state.version);
        }
        toast("Removed"); render();
      });
    };
  });
  on(scr,"[data-export]",function(b){
    b.onclick=function(){
      var data={ marks:marks(), bookmarks:bookmarks(), exported:new Date().toISOString() };
      var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
      var url=URL.createObjectURL(blob);
      var a=document.createElement("a");
      a.href=url; a.download="applied-word-marks.json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); },5000);
      toast("Exported");
    };
  });
  on(scr,"[data-wipe]",function(b){
    b.onclick=function(){
      if(b.dataset.armed){
        jset("marks",{}); jset("bookmarks",[]); jset("plandone",{});
        ls("streak","0"); ls("lastWalk","");
        Promise.all(TIERS.filter(function(t){return t.available;})
          .map(function(t){ return removeTier(t.id); }))
          .then(function(){ state.meta={}; state.loaded={}; toast("Everything cleared"); render(); });
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
  if(!anyInstalled()){ state.tab="settings"; render(); return toast("Download a translation first"); }
  state.book=r.b; state.chapter=Math.min(r.c, CHAPS[r.b]);
  state.tab="bible"; state.bview="read"; clearVerseSelection();
  ls("book",state.book); ls("chapter",state.chapter);
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
  if(!verseText(r.b,r.c,r.v)){ state.tab="settings"; render(); return toast("Download a translation first"); }
  openCardFor(r.b,r.c,r.v);
}

/* ---------- sheet controls (outside the re-rendered screen) ---------- */
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
    var val=$("sheetNote").value.trim();
    setMark(state.sel.b,state.sel.c,state.sel.v,{note:val||null});
    render();
  };
  $("sheetMultiBtn").onclick=function(){
    if(!state.sel) return;
    enterMultiSelect(state.sel.v);
  };
  $("sheetCardBtn").onclick=function(){
    if(!state.sel) return;
    var s=state.sel; closeSheet(); openCardFor(s.b,s.c,s.v);
  };
  $("sheetCopyBtn").onclick=function(){
    if(!state.sel) return;
    var s=state.sel;
    var t=verseText(s.b,s.c,s.v);
    var out='"'+t+'" — '+refOf(s.b,s.c,s.v)+" ("+((state.meta[state.version]||{}).abbr||"BSB")+")";
    if(navigator.clipboard) navigator.clipboard.writeText(out).then(function(){ toast("Copied"); });
    else toast("Copy isn't available here");
  };
}

/* ---------- boot ---------- */
[].forEach.call(document.querySelectorAll("nav button"),function(b){
  b.onclick=function(){
    state.tab=b.dataset.tab;
    if(state.tab==="bible") state.bview="read";
    if(state.tab!=="bible") clearVerseSelection();
    render();
  };
});

applyTheme(state.theme);
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
