(function () {
"use strict";
const PV = window.PHRASAL, EK = window.EDAT, LS = window.LESSONS, TX = window.TEXTS;
const PV_PER = 3, EK_PER = 5;
const PV_DAYS = Math.ceil(PV.length / PV_PER), EK_DAYS = Math.ceil(EK.length / EK_PER);
const KEY = "yds_app_v1";
const REVIEW_GAPS = [1, 3, 7, 14];
const LET = "ABCDE";
const TIER = { 3: "Çok sık", 2: "Sık", 1: "Faydalı" };
const TYPE = { F: "Fiil + edat", S: "Sıfat + edat", I: "İsim + edat", K: "Edat öbeği" };
const POS = { B: "Cümle başı", A: "İki cümle arası", I: "Cümle içi", S: "Cümle sonu" };

// ---------- durum ----------
function blank() {
  return { pv: { day: 1, doneAt: {} }, ek: { day: 1, doneAt: {} }, cz: { lesson: 1, text: 1, lAns: {}, tAns: {} },
    weak: [], log: {}, today: {}, exam: "" };
}
let S;
try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { S = blank(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const todayIso = () => iso(new Date());
const dayDiff = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
function todayDone() { if (S.today.date !== todayIso()) S.today = { date: todayIso() }; return S.today; }
function markStudied(kind) { S.log[todayIso()] = 1; todayDone()[kind] = true; save(); }
function streak() {
  let n = 0; const d = new Date();
  if (!S.log[iso(d)]) d.setDate(d.getDate() - 1);
  while (S.log[iso(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// ---------- yardımcılar ----------
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hl = s => esc(s).replace(/\{([^}]+)\}/g, "<mark>$1</mark>");
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function order(seed, n) { const r = rng(seed); const a = [...Array(n).keys()]; for (let k = n - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; }
const bub = (txt, cls) => '<span class="bub ' + (cls || "") + '">' + (txt || "") + '</span>';
const app = document.getElementById("app");
const nav = document.getElementById("nav");

function dayIds(set, day) {
  const per = set === "pv" ? PV_PER : EK_PER, list = set === "pv" ? PV : EK, out = [];
  for (let i = (day - 1) * per; i < Math.min(day * per, list.length); i++) out.push(set[0] + i);
  return out;
}
function reviewIds() {
  const ids = new Set(), t = todayIso();
  ["pv", "ek"].forEach(set => {
    Object.entries(S[set].doneAt).forEach(([day, date]) => {
      if (REVIEW_GAPS.includes(dayDiff(date, t))) dayIds(set, +day).forEach(id => ids.add(id));
    });
  });
  S.weak.forEach(id => ids.add(id));
  return [...ids];
}

// ---------- görünümler ----------
let view = "today", deck = null, cloze = null;

function go(v) { view = v; deck = v === "deck" ? deck : null; render(); window.scrollTo(0, 0); }

function render() {
  nav.hidden = view === "deck";
  nav.querySelectorAll("button").forEach(b => b.setAttribute("aria-current", b.dataset.nav === view ? "page" : "false"));
  if (view === "today") app.innerHTML = vToday();
  else if (view === "deck") app.innerHTML = vDeck();
  else if (view === "lesson") app.innerHTML = vLesson();
  else if (view === "text") app.innerHTML = vText();
  else if (view === "archive") app.innerHTML = vArchive();
  else if (view === "settings") app.innerHTML = vSettings();
}

function vToday() {
  const td = todayDone(), st = streak();
  const date = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  let week = "";
  for (let k = 6; k >= 0; k--) { const d = new Date(); d.setDate(d.getDate() - k); week += bub("", S.log[iso(d)] ? "on" : ""); }
  const rv = reviewIds();
  const rows = [];
  if (S.pv.day <= PV_DAYS) rows.push(task("pv", td.pv, "Phrasal verbs", "Gün " + S.pv.day + " · 3 yeni kart"));
  if (S.ek.day <= EK_DAYS) rows.push(task("ek", td.ek, "Edatlı kalıplar", "Gün " + S.ek.day + " · 5 yeni kart"));
  if (rv.length) rows.push(task("rv", td.rv, "Tekrar", rv.length + " kart · 1, 3, 7, 14 gün önceki ve bilemediklerin"));
  if (S.cz.lesson <= LS.length) rows.push(task("cl", td.cz, "Cloze kuralları", "Ders " + S.cz.lesson + " · " + LS[S.cz.lesson - 1].t));
  else if (S.cz.text <= TX.length) rows.push(task("ct", td.cz, "Cloze metni", "Metin " + S.cz.text + " · " + TX[S.cz.text - 1].t));
  let cd = "";
  if (S.exam) { const n = dayDiff(todayIso(), S.exam); if (n >= 0) cd = '<p class="countdown">Sınava <b>' + n + '</b> gün kaldı</p>'; }
  return '<div class="view"><div class="timing">' + "<i></i>".repeat(18) + '</div>' +
    '<div class="formhead"><div><div class="label">YDS çalışma formu</div><h1>Bugün</h1></div><div class="date">' + esc(date) + '</div></div>' +
    cd +
    '<div class="streak"><div><div class="n">' + st + '</div><div class="t">gün üst üste çalıştın</div></div><div class="week" aria-label="Son 7 gün">' + week + '</div></div>' +
    '<div class="sectionlabel">Bugünün görevleri</div><div class="tasks">' + rows.join("") + '</div></div>';
}
function task(act, done, name, sub) {
  return '<button class="task' + (done ? " done" : "") + '" data-start="' + act + '">' + bub(done ? "✓" : "", done ? "on" : "") +
    '<span><span class="name">' + esc(name) + '</span><br><span class="sub">' + esc(sub) + '</span></span><span class="go" aria-hidden="true">›</span></button>';
}

// ---------- deste ----------
function startDeck(kind, day) {
  let ids, title, complete = null;
  if (kind === "rv") { ids = reviewIds(); title = "Tekrar"; complete = { kind: "rv" }; }
  else {
    const set = kind, d = day || S[set].day;
    ids = dayIds(set, d); title = (set === "pv" ? "Phrasal verbs" : "Edatlı kalıplar") + " · Gün " + d;
    complete = { kind: set, day: d };
  }
  if (!ids.length) return;
  deck = { title, queue: ids.slice(), total: ids.length, seen: 0, known: 0, flipped: false, again: new Set(), complete, finished: false };
  view = "deck"; render(); window.scrollTo(0, 0);
}
function cardFront(id) {
  const i = +id.slice(1);
  if (id[0] === "p") { const v = PV[i]; return '<div class="kicker">Phrasal verb · ' + TIER[v[1]] + '</div><div class="phrase">' + esc(v[0]) + '</div>'; }
  const v = EK[i];
  return '<div class="kicker">' + TYPE[v[3]] + ' · ' + TIER[v[4]] + '</div><div class="phrase">' + esc(v[0]) + '<span class="prep">' + esc(v[1]) + '</span>' + esc(v[2]) + '</div>';
}
function cardBack(id) {
  const i = +id.slice(1);
  if (id[0] === "p") {
    return PV[i][2].map((m, k) => '<div class="mean"><div class="top"><span class="pct">%' + m[0] + '</span><span class="m">' + esc(m[1]) + (k === 0 && PV[i][2].length > 1 ? ' <span class="tr">· en sık</span>' : "") + '</span></div>' +
      '<div class="bar"><i style="width:' + m[0] + '%"></i></div><p class="ex">' + hl(m[2]) + '</p></div>').join("");
  }
  const v = EK[i];
  return '<p class="m" style="font-weight:600">' + esc(v[5]) + '</p><p class="ex">' + hl(v[6]) + '</p><p class="tr">' + esc(v[7]) + '</p>' + (v[8] ? '<p class="note">' + esc(v[8]) + '</p>' : "");
}
function vDeck() {
  const d = deck;
  if (d.finished) {
    const lbl = d.complete.kind === "rv" ? "Tekrar bitti" : "Gün " + d.complete.day + " tamam";
    return '<div class="deck"><div class="finish">' + bub("✓", "on") + '<h2>' + lbl + '</h2><p>' + d.total + ' karttan ' + d.known + ' tanesini ilk seferde bildin.' +
      (d.again.size ? ' Bilemediğin ' + d.again.size + ' kart tekrar listene eklendi.' : '') + '</p></div><button class="btn know wide" data-nav="today">Bugüne dön</button></div>';
  }
  const id = d.queue[0];
  let dots = "";
  for (let k = 0; k < d.total; k++) dots += bub("", k < d.seen ? "on" : "");
  return '<div class="deck"><div class="deckbar"><button class="close" data-nav="today" aria-label="Kapat">×</button><span class="title">' + esc(d.title) + '</span><span class="count">' + Math.min(d.seen + 1, d.total) + '/' + d.total + '</span></div>' +
    '<div class="dots">' + dots + '</div>' +
    '<button class="card" id="card" data-flip="1">' + cardFront(id) + (d.flipped ? '<div class="back">' + cardBack(id) + '</div>' : '<p class="front-hint">Anlamını hatırlamaya çalış, sonra karta dokun.</p>') + '</button>' +
    '<div class="deckctl">' + (d.flipped ? '<button class="btn again" data-ans="0">Tekrar göster</button><button class="btn know" data-ans="1">Biliyorum</button>' : '<p class="hint">Bildiysen sağa, bilemediysen sola kaydırabilirsin.</p>') + '</div></div>';
}
function answer(knew) {
  const d = deck, id = d.queue.shift();
  if (knew) {
    S.weak = S.weak.filter(x => x !== id);
    if (!d.again.has(id)) d.known++;
    d.seen++;
  } else {
    d.again.add(id);
    if (!S.weak.includes(id)) S.weak.push(id);
    d.queue.push(id);
  }
  d.flipped = false;
  if (!d.queue.length) finishDeck();
  save(); render();
}
function finishDeck() {
  const d = deck, c = d.complete;
  d.finished = true;
  if (c.kind === "rv") { markStudied("rv"); return; }
  S[c.kind].doneAt[c.day] = S[c.kind].doneAt[c.day] || todayIso();
  if (c.day === S[c.kind].day) S[c.kind].day++;
  markStudied(c.kind);
}

// kaydırma
let sx = null;
app.addEventListener("pointerdown", e => { if (e.target.closest("#card") && deck && deck.flipped) sx = e.clientX; });
app.addEventListener("pointermove", e => { if (sx === null) return; const c = document.getElementById("card"); if (c) c.style.transform = "translateX(" + (e.clientX - sx) * 0.6 + "px)"; });
app.addEventListener("pointerup", e => {
  if (sx === null) return;
  const dx = e.clientX - sx; sx = null;
  const c = document.getElementById("card"); if (c) c.style.transform = "";
  if (Math.abs(dx) > 70) { swiped = true; answer(dx > 0); }
});
let swiped = false;

// ---------- cloze ----------
function optsHTML(choices, ord, pick, attr) {
  return '<div class="opts">' + ord.map((oi, pos) => {
    let cls = "";
    if (pick !== null && pick !== undefined) cls = oi === 0 ? "ok" : (oi === pick ? "no" : "");
    return '<button class="opt ' + (oi === 0 && pick !== null && pick !== undefined ? "ok" : "") + '" ' + attr + ' data-o="' + oi + '"' + (pick !== null && pick !== undefined ? " disabled" : "") + '>' + bub(LET[pos], cls) + '<span>' + esc(choices[oi]) + '</span></button>';
  }).join("") + '</div>';
}
const expHTML = (pick, right, text) => pick === null || pick === undefined ? "" : '<p class="exp"><b>' + (pick === 0 ? "Doğru. " : "Doğru cevap: " + esc(right) + ". ") + '</b>' + text + '</p>';

function openLesson(n) { cloze = { n: n, open: new Set() }; view = "lesson"; render(); window.scrollTo(0, 0); }
function openText(n) { cloze = { n: n, open: new Set() }; view = "text"; render(); window.scrollTo(0, 0); }

function vLesson() {
  const n = cloze.n, L = LS[n - 1], a = S.cz.lAns[n] || [null, null, null];
  const items = L.items.map((it, i) => {
    const [w, kind, mean, pos, fol, pat, note, en, tr] = it;
    const where = pos.split("").map(k => POS[k]).join(", ");
    const open = cloze.open.has(i);
    return '<div class="item"><span class="kind">' + esc(kind) + '</span><span class="w">' + esc(w) + '</span><span><b>' + esc(mean) + '</b></span>' +
      '<p class="facts"><b>Nerede:</b> ' + esc(where) + (fol ? '<br><b>Arkasından:</b> ' + esc(fol) : "") + '</p>' +
      '<div class="pat">' + esc(pat) + '</div>' + (note ? '<p class="facts">' + esc(note) + '</p>' : "") +
      '<button class="reveal" data-ex="' + i + '"><span class="ex">' + hl(en) + '</span>' + (open ? '<span class="tr">' + esc(tr) + '</span>' : '<span class="hint">Türkçesi için dokun</span>') + '</button></div>';
  }).join("");
  const qs = L.q.map((q, i) => {
    const ord = order(n * 53 + i * 11 + 1, 4), pick = a[i];
    const sent = esc(q[0]).replace("___", '<span class="gap ' + (pick === null ? "" : pick === 0 ? "ok" : "no") + '">' + (pick === null ? "&nbsp;" : esc(q[1][0])) + '</span>');
    return '<div class="q"><div class="qn"><span>Soru ' + (i + 1) + '</span></div><p class="qt">' + sent + '</p>' + optsHTML(q[1], ord, pick, 'data-lq="' + i + '"') + expHTML(pick, q[1][0], q[2]) + '</div>';
  }).join("");
  return '<div class="view"><div class="formhead"><div><div class="label">Cloze · Ders ' + n + ' / ' + LS.length + '</div></div></div>' +
    '<div class="qhead"><h2>' + esc(L.t) + '</h2></div><p class="lead">' + esc(L.d) + '</p>' + items +
    '<div class="trap"><b>Tuzak: </b>' + esc(L.trap) + '</div><div class="sectionlabel">Kendini dene</div>' + qs +
    '<div class="row2"><button class="btn" data-lgo="' + (n - 1) + '"' + (n === 1 ? " disabled" : "") + '>Önceki ders</button><button class="btn know" data-nav="today">Bugüne dön</button></div></div>';
}
function vText() {
  const n = cloze.n, T = TX[n - 1], a = S.cz.tAns[n] || [null, null, null, null, null];
  const passage = T.s.map((s, i) => {
    const h = esc(s).replace(/\[(\d)\]/g, (_, d) => { const k = +d - 1, p = a[k]; return p === null ? '<span class="gap">(' + d + ')</span>' : '<span class="gap ' + (p === 0 ? "ok" : "no") + '">' + esc(T.q[k][1][0]) + '</span>'; });
    return '<span class="sent" data-s="' + i + '">' + h + '</span> ' + (cloze.open.has(i) ? '<span class="trline">' + esc(T.tr[i]) + '</span>' : "");
  }).join("");
  const qs = T.q.map((q, i) => {
    const ord = order(n * 31 + i * 7 + 3, 5);
    return '<div class="q"><div class="qn"><span>Boşluk ' + (i + 1) + '</span><span>' + esc(q[0]) + '</span></div>' + optsHTML(q[1], ord, a[i], 'data-tq="' + i + '"') + expHTML(a[i], q[1][0], q[2]) + '</div>';
  }).join("");
  return '<div class="view"><div class="formhead"><div><div class="label">Cloze · Metin ' + n + ' / ' + TX.length + '</div></div></div>' +
    '<div class="qhead"><h2>' + esc(T.t) + '</h2></div><p class="lead">Bir cümlenin Türkçesi için üstüne dokun. Çeviri cevabı da gösterir.</p>' +
    '<div class="passage">' + passage + '</div>' + qs +
    '<div class="row2"><button class="btn" data-tgo="' + (n - 1) + '"' + (n === 1 ? " disabled" : "") + '>Önceki metin</button><button class="btn know" data-nav="today">Bugüne dön</button></div></div>';
}
function clozeAnswer(kind, qi, oi) {
  const n = cloze.n, store = kind === "l" ? S.cz.lAns : S.cz.tAns, size = kind === "l" ? 3 : 5;
  const a = (store[n] || Array(size).fill(null)).slice();
  a[qi] = oi; store[n] = a;
  if (a.every(x => x !== null)) {
    if (kind === "l" && n === S.cz.lesson) { S.cz.lesson++; markStudied("cz"); }
    if (kind === "t" && n === S.cz.text) { S.cz.text++; markStudied("cz"); }
  }
  save(); render();
}

// ---------- arşiv ----------
function vArchive() {
  const grid = (count, doneFn, curN, attr) => { let h = ""; for (let k = 1; k <= count; k++) h += '<button ' + attr + '="' + k + '" aria-label="' + k + '">' + bub(k, (doneFn(k) ? "on " : "") + (k === curN ? "cur" : "")) + '</button>'; return '<div class="grid">' + h + '</div>'; };
  const done = (store, size) => k => { const a = store[k]; return a && a.length === size && a.every(x => x !== null); };
  return '<div class="view"><div class="formhead"><div><div class="label">Tüm içerik</div><h1>Arşiv</h1></div></div>' +
    '<p class="lead">Doldurulmuş yuvarlaklar bitirdiğin günler. İstediğine dokunup tekrar açabilirsin.</p>' +
    '<div class="sectionlabel">Phrasal verbs · ' + PV.length + ' fiil</div>' + grid(PV_DAYS, k => S.pv.doneAt[k], S.pv.day, "data-apv") +
    '<div class="sectionlabel">Edatlı kalıplar · ' + EK.length + ' kalıp</div>' + grid(EK_DAYS, k => S.ek.doneAt[k], S.ek.day, "data-aek") +
    '<div class="sectionlabel">Cloze kuralları · ' + LS.length + ' ders</div>' + grid(LS.length, done(S.cz.lAns, 3), S.cz.lesson, "data-acl") +
    '<div class="sectionlabel">Cloze metinleri · ' + TX.length + ' metin</div>' + grid(TX.length, done(S.cz.tAns, 5), S.cz.text, "data-act") + '</div>';
}

// ---------- ayarlar ----------
let msg = "", msgErr = false, resetArmed = false;
function code() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
function vSettings() {
  return '<div class="view"><div class="formhead"><div><div class="label">Uygulama</div><h1>Ayarlar</h1></div></div>' +
    '<div class="field"><label for="exam">Sınav tarihi</label><input type="date" id="exam" value="' + esc(S.exam || "") + '"><span class="help">Girersen Bugün ekranında kalan gün sayısı görünür.</span></div>' +
    '<div class="field"><label for="out">İlerleme yedeği</label><span class="help">İlerlemen bu telefonda saklanıyor. Telefon değiştirirsen bu kodu kopyalayıp yeni telefonda aşağıya yapıştır.</span><textarea id="out" readonly>' + code() + '</textarea><button class="btn" id="copy">Kodu kopyala</button></div>' +
    '<div class="field"><label for="in">Yedeği geri yükle</label><textarea id="in" placeholder="Kopyaladığın kodu buraya yapıştır"></textarea><button class="btn" id="restore">Geri yükle</button></div>' +
    (msg ? '<p class="msg' + (msgErr ? " err" : "") + '">' + esc(msg) + '</p>' : "") +
    '<div class="field"><label>Ana ekrana ekleme</label><ol class="steps"><li>iPhone: Safari’de Paylaş, sonra Ana Ekrana Ekle.</li><li>Android: Chrome’da sağ üstteki menü, sonra Ana ekrana ekle.</li></ol></div>' +
    '<button class="btn again" id="reset">' + (resetArmed ? "Emin misin? Tüm ilerleme silinecek. Tekrar bas." : "İlerlemeyi sıfırla") + '</button></div>';
}

// ---------- olaylar ----------
document.addEventListener("click", e => {
  const t = e.target; let el;
  if ((el = t.closest("[data-nav]"))) { msg = ""; resetArmed = false; return go(el.dataset.nav); }
  if ((el = t.closest("[data-start]"))) {
    const k = el.dataset.start;
    if (k === "pv" || k === "ek" || k === "rv") return startDeck(k);
    if (k === "cl") return openLesson(S.cz.lesson);
    if (k === "ct") return openText(S.cz.text);
  }
  if ((el = t.closest("[data-flip]"))) { if (swiped) { swiped = false; return; } if (!deck.flipped) { deck.flipped = true; render(); } return; }
  if ((el = t.closest("[data-ans]"))) return answer(el.dataset.ans === "1");
  if ((el = t.closest("[data-ex]"))) { const i = +el.dataset.ex; cloze.open.has(i) ? cloze.open.delete(i) : cloze.open.add(i); return render(); }
  if ((el = t.closest(".sent"))) { const i = +el.dataset.s; cloze.open.has(i) ? cloze.open.delete(i) : cloze.open.add(i); return render(); }
  if ((el = t.closest(".opt")) && !el.disabled) {
    if (el.dataset.lq !== undefined) return clozeAnswer("l", +el.dataset.lq, +el.dataset.o);
    if (el.dataset.tq !== undefined) return clozeAnswer("t", +el.dataset.tq, +el.dataset.o);
  }
  if ((el = t.closest("[data-lgo]")) && !el.disabled) return openLesson(+el.dataset.lgo);
  if ((el = t.closest("[data-tgo]")) && !el.disabled) return openText(+el.dataset.tgo);
  if ((el = t.closest("[data-apv]"))) return startDeck("pv", +el.dataset.apv);
  if ((el = t.closest("[data-aek]"))) return startDeck("ek", +el.dataset.aek);
  if ((el = t.closest("[data-acl]"))) return openLesson(+el.dataset.acl);
  if ((el = t.closest("[data-act]"))) return openText(+el.dataset.act);
  if (t.id === "copy") {
    const txt = document.getElementById("out").value;
    const done = ok => { msg = ok ? "Kod kopyalandı." : "Kopyalanamadı. Kodu basılı tutup kendin kopyala."; msgErr = !ok; render(); };
    try { navigator.clipboard.writeText(txt).then(() => done(true), () => done(false)); } catch (err) { done(false); }
    return;
  }
  if (t.id === "restore") {
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(document.getElementById("in").value.trim()))));
      if (!data || !data.pv || !data.ek) throw 0;
      S = Object.assign(blank(), data); save(); msg = "İlerlemen geri yüklendi."; msgErr = false;
    } catch (err) { msg = "Bu kod okunamadı. Kodun tamamını kopyaladığından emin ol."; msgErr = true; }
    return render();
  }
  if (t.id === "reset") {
    if (!resetArmed) { resetArmed = true; return render(); }
    S = blank(); save(); resetArmed = false; msg = "İlerleme sıfırlandı."; msgErr = false; return render();
  }
});
document.addEventListener("change", e => { if (e.target.id === "exam") { S.exam = e.target.value; save(); } });

if ("serviceWorker" in navigator && location.protocol === "https:" && !/claude\.ai|claudeusercontent/.test(location.host)) {
  try { navigator.serviceWorker.register("sw.js").catch(() => {}); } catch (e) {}
}
render();
})();
