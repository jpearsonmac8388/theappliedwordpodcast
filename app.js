/* ============================================================
   THE APPLIED WORD — app
   ============================================================ */

var SHOW_URL  = "https://open.spotify.com/show/75QaXUSGooCOG8oqKhuNmG";
var EMBED_URL = "https://open.spotify.com/embed/show/75QaXUSGooCOG8oqKhuNmG?utm_source=generator&theme=0";

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
  sel: null,                       // {b,c,v}
  listTab: "highlights",
  // devotion
  devMode: "today",                // today | spurgeon
  spDate: stampOf(new Date()),
  spHalf: "morning",
  spData: null, spState: "idle",
  // plans
  planDate: stampOf(new Date()),
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
  if(state.devMode==="spurgeon") return spurgeonView();

  var d=today(), n=dayOfYear(d);
  var dev=DEVOTIONS[(n-1) % DEVOTIONS.length];
  var done=walkedToday();

  return '<div class="pad">'+
    '<div class="datestrip"><div class="daynum">'+n+'</div><div class="daymeta">'+
      d.toLocaleDateString("en-US",{weekday:"long"}).toUpperCase()+" · "+
      d.toLocaleDateString("en-US",{month:"long",day:"numeric"}).toUpperCase()+
      "<br>TODAY'S WORD</div></div>"+

    '<div class="tabsel" style="margin-top:18px">'+
      '<button class="on" data-dev="today">TODAY</button>'+
      '<button data-dev="spurgeon">SPURGEON</button>'+
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
    '<a class="cta ghost" href="'+SHOW_URL+'" target="_blank" rel="noopener">FOLLOW THE SHOW</a>'+
    '<div class="where"><h4>IF THE PLAYER DOESN\'T LOAD</h4>'+
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
    return '<div class="v'+(state.sel&&state.sel.v===v?" sel":"")+'"'+
      (m&&m.hl?' data-hl="'+m.hl+'"':'')+' data-v="'+v+'">'+
      '<div class="v-no">'+v+'</div>'+
      '<div class="v-tx">'+esc(text)+'</div>'+
      (m&&m.note?'<div class="marks"><span title="note">&#9998;</span></div>':'')+
    '</div>';
  }).join("");

  return '<div class="pad">'+readBar()+
    '<div class="chapter-title">'+esc(BOOKS[state.book])+' '+state.chapter+'</div>'+
    '<div class="chapter-sub">'+esc((state.meta[state.version]||{}).abbr||"")+
      ' · '+verses.length+' VERSES'+(marked?' · BOOKMARKED':'')+'</div>'+
    rows+
    '<div style="display:flex;gap:9px;margin-top:26px">'+
      '<button class="cta ghost" style="margin-top:0" data-mark="1">'+
        (marked?'&#9733; BOOKMARKED':'&#9734; BOOKMARK THIS CHAPTER')+'</button></div>'+
    '<div class="foot">TAP ANY VERSE TO HIGHLIGHT, NOTE, OR MAKE A CARD</div></div>';
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
   VERSE CARDS
   ============================================================ */
var RATIOS={ "9:16":[1080,1920], "3:4":[1080,1440] };

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
      '<button class="'+(state.cardRatio==="9:16"?"on":"")+'" data-ratio="9:16">9:16 · REELS &amp; STORIES</button>'+
      '<button class="'+(state.cardRatio==="3:4"?"on":"")+'" data-ratio="3:4">3:4 · FEED POST</button>'+
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

  // background + glow, matching the app
  x.fillStyle="#1E140C"; x.fillRect(0,0,W,H);
  var g=x.createRadialGradient(W/2,H*0.10,0,W/2,H*0.10,W*1.05);
  g.addColorStop(0,"rgba(209,169,78,0.18)");
  g.addColorStop(1,"rgba(209,169,78,0)");
  x.fillStyle=g; x.fillRect(0,0,W,H);

  var pad=Math.round(W*0.105);

  // corner brackets
  x.strokeStyle="rgba(209,169,78,0.85)"; x.lineWidth=Math.max(3,W*0.004);
  var bl=W*0.055, o=pad*0.62;
  x.beginPath();
  x.moveTo(o,o+bl); x.lineTo(o,o); x.lineTo(o+bl,o);
  x.moveTo(W-o-bl,H-o); x.lineTo(W-o,H-o); x.lineTo(W-o,H-o-bl);
  x.stroke();

  // wordmark
  x.textAlign="center"; x.fillStyle="#E4C374";
  x.font="700 "+Math.round(W*0.026)+"px 'JetBrains Mono',monospace";
  x.fillText("T H E   A P P L I E D   W O R D", W/2, pad*1.5);

  // verse text, wrapped
  var size=Math.round(W*0.072);
  var maxW=W-pad*2;
  var words=cv.text.split(/\s+/), lines=[], line="";
  x.font="italic "+size+"px Lora,Georgia,serif";
  for(var i=0;i<words.length;i++){
    var t=line?line+" "+words[i]:words[i];
    if(x.measureText(t).width>maxW && line){ lines.push(line); line=words[i]; }
    else line=t;
  }
  if(line) lines.push(line);

  // shrink to fit long verses
  while(lines.length*size*1.42 > H*0.52 && size>Math.round(W*0.035)){
    size-=Math.round(W*0.004);
    x.font="italic "+size+"px Lora,Georgia,serif";
    lines=[]; line="";
    for(var j=0;j<words.length;j++){
      var t2=line?line+" "+words[j]:words[j];
      if(x.measureText(t2).width>maxW && line){ lines.push(line); line=words[j]; }
      else line=t2;
    }
    if(line) lines.push(line);
  }

  var blockH=lines.length*size*1.42;
  var startY=(H-blockH)/2 - H*0.02;

  x.textAlign="left"; x.fillStyle="#F0E4CC";
  x.font="italic "+size+"px Lora,Georgia,serif";
  for(var k=0;k<lines.length;k++){
    x.fillText(lines[k], pad, startY + k*size*1.42);
  }

  // rule + reference
  var refY=startY+blockH+size*0.55;
  x.strokeStyle="#D1A94E"; x.lineWidth=Math.max(4,W*0.006);
  x.beginPath(); x.moveTo(pad,refY); x.lineTo(pad+W*0.14,refY); x.stroke();

  x.fillStyle="#E4C374";
  x.font="700 "+Math.round(W*0.030)+"px 'JetBrains Mono',monospace";
  x.fillText(cv.ref.toUpperCase()+"  ·  "+(cv.abbr||"BSB"), pad, refY+W*0.072);

  // footer
  x.textAlign="center"; x.fillStyle="rgba(183,154,120,0.85)";
  x.font="700 "+Math.round(W*0.021)+"px 'JetBrains Mono',monospace";
  x.fillText("N O   F L U F F .   J U S T   T H E   W O R D   A N D   T H E   W A L K .", W/2, H-pad*0.85);
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
  var text=verseText(b,c,v);
  if(!text) return toast("Download a translation first");
  state.cardVerse={ ref:refOf(b,c,v), text:text, abbr:(state.meta[state.version]||{}).abbr||"BSB" };
  state.tab="card"; render();
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

    '<div class="grouphd" style="margin-top:6px">BIBLE LIBRARY</div>'+
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
  {id:"plans",    label:"PLAN",     icon:"\u2637"},
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
      ls("chapter",state.chapter); render();
    };
  });
  on(scr,"[data-v]",function(b){
    b.onclick=function(){ openSheet(+b.dataset.v); };
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
      state.tab="bible"; state.bview="read"; state.sel=null;
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
  state.tab="bible"; state.bview="read"; state.sel=null;
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
    render();
  };
});

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
