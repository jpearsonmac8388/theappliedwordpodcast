/* ============================================================
   THE APPLIED WORD PODCAST — Bible engine
   Storage, downloading, and parsing for the Berean Bible tiers.
   ============================================================ */

/* ---------- canonical book data ---------- */
window.BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
"1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther",
"Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations",
"Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah",
"Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians",
"2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians",
"2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter",
"1 John","2 John","3 John","Jude","Revelation"];

window.CHAPS = [50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,
3,9,1,4,7,3,3,3,2,14,4,28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22];

window.OT_COUNT = 39;

/* ---------- Bible download ----------
   The public-domain BSB text ships with the app and is imported into IndexedDB
   only when the reader taps Download. */
window.TIERS = [
  {
    id: "bsb",
    label: "BIBLE",
    name: "Berean Standard Bible",
    abbr: "BSB",
    note: "Modern public-domain translation. Download once for full offline reading.",
    src: "data/bsb.txt",
    origin: "BereanBible.com",
    license: "Public Domain",
    format: "tagged",
    available: true
  },
  {
    id: "asv",
    label: "BIBLE",
    name: "American Standard Version (1901)",
    abbr: "ASV",
    note: "Classic formal-equivalence translation first published in 1901.",
    src: "data/asv.txt",
    origin: "eBible.org / Scrollmapper",
    license: "Public Domain",
    format: "tagged",
    available: true
  },
  {
    id: "ylt",
    label: "BIBLE",
    name: "Young's Literal Translation",
    abbr: "YLT",
    note: "Robert Young's highly literal English translation.",
    src: "data/ylt.txt",
    origin: "eBible.org / Scrollmapper",
    license: "Public Domain",
    format: "tagged",
    available: true
  },
  {
    id: "kjv",
    label: "BIBLE",
    name: "King James Version",
    abbr: "KJV",
    note: "The historic King James Version in a 66-book edition.",
    src: "data/kjv.txt",
    origin: "eBible.org / Scrollmapper",
    license: "Public Domain in the United States; special Crown rights may apply in the United Kingdom",
    format: "tagged",
    available: true
  }
];

/* ---------- IndexedDB ----------
   A translation runs several megabytes, well past what localStorage
   reliably holds, so the text lives in IndexedDB. Highlights, notes and
   bookmarks are small and live in localStorage where they're easy to read. */
(function () {
  var DB = "applied-word", STORE = "kv", VER = 1, dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      if (typeof indexedDB === "undefined") return rej(new Error("no IndexedDB"));
      var r = indexedDB.open(DB, VER);
      r.onupgradeneeded = function () {
        if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
      };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbp;
  }

  window.store = {
    get: function (k) {
      return open().then(function (db) {
        return new Promise(function (res, rej) {
          var r = db.transaction(STORE, "readonly").objectStore(STORE).get(k);
          r.onsuccess = function () { res(r.result === undefined ? null : r.result); };
          r.onerror = function () { rej(r.error); };
        });
      });
    },
    set: function (k, v) {
      return open().then(function (db) {
        return new Promise(function (res, rej) {
          var tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).put(v, k);
          tx.oncomplete = function () { res(true); };
          tx.onerror = function () { rej(tx.error); };
        });
      });
    },
    del: function (k) {
      return open().then(function (db) {
        return new Promise(function (res, rej) {
          var tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).delete(k);
          tx.oncomplete = function () { res(true); };
          tx.onerror = function () { rej(tx.error); };
        });
      });
    }
  };
})();

/* ---------- book name resolution ---------- */
window.resolveBook = (function () {
  var map = {};
  function add(k, i) { map[k.toLowerCase().replace(/[\s.]/g, "")] = i; }
  BOOKS.forEach(function (n, i) { add(n, i); });
  var extra = {
    "Gen":0,"Ge":0,"Exo":1,"Exod":1,"Ex":1,"Lev":2,"Le":2,"Num":3,"Nu":3,"Deut":4,"Dt":4,"Deu":4,
    "Josh":5,"Jos":5,"Judg":6,"Jdg":6,"Jdgs":6,"Rth":7,"Ru":7,
    "1Sam":8,"1Sa":8,"1Sm":8,"2Sam":9,"2Sa":9,"2Sm":9,
    "1Kgs":10,"1Ki":10,"1Kin":10,"2Kgs":11,"2Ki":11,"2Kin":11,
    "1Chr":12,"1Ch":12,"2Chr":13,"2Ch":13,"Ezr":14,"Neh":15,"Est":16,"Esth":16,
    "Jb":17,"Psalm":18,"Pslm":18,"Psa":18,"Ps":18,"Prov":19,"Pro":19,"Prv":19,
    "Eccl":20,"Ecc":20,"Qoh":20,"Song":21,"Songs":21,"SoS":21,"Canticles":21,"Cant":21,
    "Isa":22,"Is":22,"Jer":23,"Lam":24,"Ezek":25,"Eze":25,"Ezk":25,"Dan":26,"Dn":26,
    "Hos":27,"Joe":28,"Jol":28,"Amo":29,"Am":29,"Obad":30,"Oba":30,"Ob":30,"Jon":31,"Jnh":31,
    "Mic":32,"Mch":32,"Nah":33,"Nam":33,"Hab":34,"Zeph":35,"Zep":35,"Hag":36,"Hg":36,
    "Zech":37,"Zec":37,"Mal":38,"Matt":39,"Mt":39,"Mrk":40,"Mk":40,"Mar":40,"Luk":41,"Lk":41,
    "Jhn":42,"Jn":42,"Joh":42,"Act":43,"Rom":44,"Ro":44,
    "1Cor":45,"1Co":45,"2Cor":46,"2Co":46,"Gal":47,"Ga":47,"Eph":48,"Ephes":48,
    "Phil":49,"Php":49,"Philip":49,"Col":50,"1Thess":51,"1Th":51,"1Thes":51,
    "2Thess":52,"2Th":52,"2Thes":52,"1Tim":53,"1Ti":53,"2Tim":54,"2Ti":54,
    "Tit":55,"Ti":55,"Phlm":56,"Phm":56,"Philem":56,"Heb":57,"Jas":58,"Jam":58,
    "1Pet":59,"1Pe":59,"1Pt":59,"2Pet":60,"2Pe":60,"2Pt":60,
    "1Jn":61,"1Jo":61,"1Joh":61,"2Jn":62,"2Jo":62,"3Jn":63,"3Jo":63,
    "Jde":64,"Rev":65,"Rv":65
  };
  Object.keys(extra).forEach(function (k) { add(k, extra[k]); });

  return function (name) {
    return map[String(name).toLowerCase().replace(/[\s.]/g, "")];
  };
})();

/* ---------- parsers ---------- */

/* "Book C:V<TAB>text" — used by BSB and BLB. */
window.parseTagged = function (raw) {
  var out = {}, count = 0;
  var re = /^\s*((?:[1-3]\s*)?[A-Za-z][A-Za-z' ]*?)\s+(\d+)\s*[:.]\s*(\d+)\s*[\t|]?\s+(.+?)\s*$/;
  var lines = raw.split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i];
    if (!l.trim()) continue;
    var m = l.match(re);
    if (!m) continue;
    var b = resolveBook(m[1]);
    if (b === undefined) continue;
    var c = +m[2], v = +m[3];
    if (c < 1 || c > CHAPS[b]) continue;
    if (!out[b]) out[b] = {};
    if (!out[b][c]) out[b][c] = {};
    out[b][c][v] = m[4].replace(/\s+/g, " ").trim();
    count++;
  }
  return { data: out, count: count };
};

/* Paragraph style used by the Reader's Bible: a "Book Chapter" header
   shares a block with its section title, then verses follow one per line. */
window.parseReaders = function (raw) {
  var lines = raw.split(/\r?\n/), blocks = [], cur = [];
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "") { if (cur.length) blocks.push(cur); cur = []; }
    else cur.push(lines[i]);
  }
  if (cur.length) blocks.push(cur);

  var headerRe = /^([1-3]?\s?[A-Za-z][A-Za-z .]*?)\s+(\d+)$/;
  var out = {}, count = 0, cb = null, cc = null, cv = 0;

  for (var j = 0; j < blocks.length; j++) {
    var block = blocks[j];
    var m = block[0].match(headerRe);
    var b = m ? resolveBook(m[1].trim()) : undefined;
    if (m && b !== undefined) { cb = b; cc = +m[2]; cv = 0; continue; }
    if (cb === null) continue;
    for (var k = 0; k < block.length; k++) {
      cv++;
      if (!out[cb]) out[cb] = {};
      if (!out[cb][cc]) out[cb][cc] = {};
      out[cb][cc][cv] = block[k].trim();
      count++;
    }
  }
  return { data: out, count: count };
};

/* ---------- download a tier ---------- */
window.downloadTier = function (tier, onProgress) {
  return fetch(tier.src)
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      var total = +res.headers.get("content-length") || 0;
      if (!res.body || !total || !onProgress) return res.text();

      // Stream so the progress bar reflects the real download.
      var reader = res.body.getReader(), chunks = [], got = 0;
      return (function pump() {
        return reader.read().then(function (r) {
          if (r.done) {
            var all = new Uint8Array(got), at = 0;
            chunks.forEach(function (c) { all.set(c, at); at += c.length; });
            return new TextDecoder("utf-8").decode(all);
          }
          chunks.push(r.value);
          got += r.value.length;
          onProgress(Math.min(99, Math.round((got / total) * 100)));
          return pump();
        });
      })();
    })
    .then(function (raw) {
      if (onProgress) onProgress(100);
      var parsed = tier.format === "readers" ? parseReaders(raw) : parseTagged(raw);
      if (!parsed.count) throw new Error("nothing parsed from the file");
      return store.set("bible:" + tier.id, parsed.data).then(function () {
        var meta = {
          id: tier.id, name: tier.name, abbr: tier.abbr,
          verses: parsed.count, books: Object.keys(parsed.data).length,
          at: new Date().toISOString()
        };
        return store.set("meta:" + tier.id, meta).then(function () { return meta; });
      });
    });
};

window.removeTier = function (id) {
  return store.del("bible:" + id).then(function () { return store.del("meta:" + id); });
};
