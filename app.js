/* Diyaliz Rehberi · arayüz. Hasta verisi yalnız bu cihazda (localStorage) tutulur; hiçbir veri sunucuya gönderilmez. */
(function () {
  'use strict';
  const D = window.DR, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const AUT = 'Prof. Dr. Ekrem Kara · Prof. Dr. Tuncay Şahutoğlu', VER = '0.7', VDATE = '16.11.2026', KEY = 'diyaliz-rehberi-v1';
  const MODN = { HD: 'Hemodiyaliz', PD: 'Periton diyalizi' }, LVL = { bad: 'Öncelikli', warn: 'Uyarı', info: 'Bilgi', ok: 'Hedefte' };
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const ayAd = a => a ? AYLAR[parseInt(a.slice(5, 7), 10) - 1] + ' ' + a.slice(0, 4) : '—';
  const ayKisa = a => a ? AYLAR[parseInt(a.slice(5, 7), 10) - 1].slice(0, 3) + ' ' + a.slice(2, 4) : '';
  const nowAy = () => { const d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); };
  const fmt = (v, d) => v == null || v === '' ? '—' : (typeof v === 'number' ? D.tr(v, d) : String(v));

  /* ---------------- Veri ---------------- */
  let S = { patients: [] }, storageOK = true, TMP = {}, cur = { route: 'home' }, saveT;
  function load() { try { const r = localStorage.getItem(KEY); if (r) S = JSON.parse(r); } catch (e) { storageOK = false; } if (!S || !Array.isArray(S.patients)) S = { patients: [] }; }
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); storageOK = true; } catch (e) { storageOK = false; } }, 200); }
  const byMod = m => S.patients.filter(p => p.mod === m).sort((a, b) => String(a.kod).localeCompare(String(b.kod), 'tr', { numeric: true }));
  const getP = id => id && id[0] === '_' ? TMP[id.slice(1)] : S.patients.find(p => p.id === id);
  const lastAy = p => { const m = D.sortedMonths(p); return m.length ? m[m.length - 1] : null; };
  function newVisit(p, ay) { const v = {}, pm = D.prevMonth(p, ay); if (pm) D.fieldsOf(p.mod).forEach(f => { if (f.c && p.visits[pm][f.k] != null && p.visits[pm][f.k] !== '') v[f.k] = p.visits[pm][f.k]; }); p.visits[ay] = v; return v; }

  /* ---------------- Gezinme ---------------- */
  const NAV = [['', [['home', 'Ana sayfa']]],
    ['Hemodiyaliz', [['list/HD', 'Hastalar'], ['hizli/HD', 'Hızlı hesap'], ['ozet/HD', 'Ünite göstergeleri'], ['kural/HD', 'Kural tablosu']], 'hd'],
    ['Periton diyalizi', [['list/PD', 'Hastalar'], ['hizli/PD', 'Hızlı hesap'], ['ozet/PD', 'Ünite göstergeleri'], ['kural/PD', 'Kural tablosu']], 'pd'],
    ['Genel', [['yon', 'Diyaliz Yönetmeliği'], ['veri', 'Veri ve yedek'], ['hakkinda', 'Hakkında']]]];
  function renderNav() {
    const act = cur.route.startsWith('p/') ? 'list/' + ((getP(cur.route.split('/')[1]) || {}).mod || '') : cur.route.startsWith('yeni/') ? 'list/' + cur.route.split('/')[1] : cur.route;
    $('#navlist').innerHTML = NAV.map(g => `<div class="navgroup">${g[0] ? `<div class="navlabel"><i style="background:var(--${g[2] || 'nav-dim'})"></i>${g[0]}</div>` : ''}${g[1].map(n => `<button class="navbtn" data-go="${n[0]}" ${act === n[0] ? 'aria-current="page"' : ''}>${n[1]}${n[0].startsWith('list/') ? `<span class="yr">${byMod(n[0].slice(5)).length}</span>` : ''}</button>`).join('')}</div>`).join('');
  }
  /* ---------------- Hareket: giriş, yeni öneri, değişen değer ---------------- */
  let prevRoute = 'home', seen = null;
  const RM = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  function animIn(v, sekme) {
    if (RM()) return;
    const tb = sekme && v.querySelector('.tabs');
    if (tb) { let el = tb.nextElementSibling, i = 0; while (el) { el.style.setProperty('--i', i++); el.classList.remove('tab-in'); void el.offsetWidth; el.classList.add('tab-in'); el = el.nextElementSibling; } }
    else if (window.RTEU) RTEU.enter(v);
    v.querySelectorAll('.grid,.kv,.recs').forEach(g => [...g.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 12))));
    v.querySelectorAll('.rec2').forEach((c, i) => c.style.setProperty('--i', Math.min(i, 10)));
    clearTimeout(animIn.t); animIn.t = setTimeout(() => { v.classList.remove('rt-in'); v.querySelectorAll('.tab-in').forEach(e => e.classList.remove('tab-in')); }, 2100);
  }
  /* Anahtarlı güncelleme: değişmeyen öğe korunur (animasyon kesilmez, odak ve kaydırma bozulmaz) */
  function patch(box, items, fx, anim) {
    const old = new Map([...box.children].filter(e => e.dataset.key).map(e => [e.dataset.key, e])), tpl = document.createElement('template'), out = [];
    items.forEach(([k, h]) => { let el = old.get(k);
      if (el && el.dataset.h === h) { out.push(el); return; }
      tpl.innerHTML = h.trim(); const n = tpl.content.firstElementChild; n.dataset.key = k; n.dataset.h = h;
      if (el && el.className.includes('rec-new')) n.classList.add('rec-new');
      out.push(n); if (anim) fx(n, !el); });
    box.replaceChildren(...out);
  }
  function pop(el, cls) { if (!el || RM()) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function go(route, keepScroll) {
    if (cur.route !== (route || 'home')) prevRoute = cur.route;
    cur.route = route || 'home';
    try { history.replaceState(null, '', '#' + cur.route); } catch (e) { }
    const a = cur.route.split('/'), v = $('#view'); let h, mod = null;
    if (a[0] === 'list') { h = viewList(a[1]); mod = a[1]; }
    else if (a[0] === 'yeni') { h = viewEdit(a[1], a[2]); mod = a[1]; }
    else if (a[0] === 'p') { const p = getP(a[1]); if (!p) return go('home'); h = viewPatient(p, a[2], a[3]); mod = p.mod; }
    else if (a[0] === 'hizli') { h = viewQuick(a[1]); mod = a[1]; }
    else if (a[0] === 'ozet') { h = viewKpi(a[1], a[2]); mod = a[1]; }
    else if (a[0] === 'kural') { h = viewRules(a[1]); mod = a[1]; }
    else if (a[0] === 'yon') h = viewYon();
    else if (a[0] === 'veri') h = viewVeri();
    else if (a[0] === 'hakkinda') h = viewAbout();
    else h = viewHome();
    if (mod) v.setAttribute('data-mod', mod); else v.removeAttribute('data-mod');
    const base = r => r.split('/').slice(0, 2).join('/'), ayni = a[0] === 'p' && base(prevRoute) === base(cur.route);
    v.innerHTML = h; renderNav(); $('#side').classList.remove('open');
    seen = null;
    if (a[0] === 'p' || a[0] === 'hizli') refresh();
    if (!keepScroll) animIn(v, ayni);
    prevRoute = cur.route;
    if (!keepScroll) window.scrollTo(0, 0);
  }

  /* ---------------- Ortak parçalar ---------------- */
  const authors = () => `<div class="authors"><span><i>EK</i>Prof. Dr. Ekrem KARA</span><span><i>TŞ</i>Prof. Dr. Tuncay ŞAHUTOĞLU</span></div>`;
  const disc = () => `<p class="disclaimer">Klinik karar desteği amaçlıdır; hasta özelinde hekim değerlendirmesinin ve ünite protokollerinin yerini tutmaz. Öneriler reçete değildir; uygulama kararı hekime aittir. Sürüm ${VER} · ${VDATE}</p>`;
  function fieldHTML(f, val, attr, idp) {
    const id = idp + f.k, lab = `<label for="${id}">${esc(f.l)}${f.u ? `<u>${esc(f.u)}</u>` : ''}</label>`, v = val == null ? '' : val; let inp;
    if (f.t === 's') inp = `<select id="${id}" ${attr}="${f.k}"><option value=""></option>${f.o.map(o => `<option ${String(v) === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else if (f.t === 'm') inp = `<input id="${id}" ${attr}="${f.k}" type="month" value="${esc(v)}">`;
    else inp = `<input id="${id}" ${attr}="${f.k}" type="text" ${f.t === 'n' ? 'inputmode="decimal"' : ''} autocomplete="off" value="${esc(v)}">`;
    return `<div class="f${f.t === 'x' ? ' wide' : ''}" data-f="${f.k}">${lab}${inp}<small data-h="${esc(f.h || '')}">${esc(f.h || '')}</small></div>`;
  }
  function recHTML(r, v, canDecide) {
    const k = (v.kar || {})[r.id];
    return `<div class="rec2 ${r.s}"><div class="hd"><span class="pill ${r.s}">${LVL[r.s]}</span><b>${esc(r.k)}</b>${r.why ? `<span class="why">${esc(r.why)}</span>` : ''}</div><p>${esc(r.o)}</p>
      <div class="ft"><span class="src">${esc(r.id)} · ${esc(r.src)}</span>${canDecide && r.s !== 'ok' ? `<span class="kar noprint" role="group" aria-label="Hekim kararı"><button type="button" data-act="kar" data-id="${r.id}" data-val="e" aria-pressed="${k === 'e'}">Uygun bulundu</button><button type="button" data-act="kar" data-id="${r.id}" data-val="h" aria-pressed="${k === 'h'}">Uygulanmadı</button></span>` : ''}</div></div>`;
  }
  function spark(vals, w, h) {
    const pts = vals.map((v, i) => [i, v]).filter(x => x[1] != null); if (pts.length < 2) return '';
    const mn = Math.min(...pts.map(x => x[1])), mx = Math.max(...pts.map(x => x[1])), n = vals.length - 1 || 1, X = i => 3 + i / n * (w - 6), Y = v => mx === mn ? h / 2 : h - 4 - (v - mn) / (mx - mn) * (h - 8);
    const last = pts[pts.length - 1];
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline pathLength="1" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(x => X(x[0]).toFixed(1) + ',' + Y(x[1]).toFixed(1)).join(' ')}"/><circle cx="${X(last[0]).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="2.6" fill="var(--accent)"/></svg>`;
  }

  /* ---------------- Ana sayfa ---------------- */
  function modCard(m) {
    const ps = byMod(m), bad = ps.filter(p => { const a = lastAy(p); return a && D.evaluate(p, a).recs.some(r => r.s === 'bad'); }).length;
    return `<section class="modcard" data-mod="${m}"><h2>${MODN[m]}<span>${ps.length} hasta</span></h2>
      <p>${m === 'HD' ? 'Yeterlilik, reçete, volüm ve kan basıncı, potasyum ve asit-baz, anemi, KBH-MKB, nutrisyon, damar erişimi, enfeksiyon ve aşı, tetkik takvimi.' : 'Yeterlilik ve PET, solüsyon reçetesi, volüm, potasyum ve asit-baz, anemi, KBH-MKB, nutrisyon, peritonit ve kateter, enfeksiyon ve aşı, tetkik takvimi.'}</p>
      ${bad ? `<p><span class="pill bad">${bad} hastada öncelikli öneri</span></p>` : ''}
      <div class="row"><button class="btn pri" data-go="list/${m}">Hastalar</button><button class="btn" data-go="hizli/${m}">Hızlı hesap</button><button class="btn" data-go="ozet/${m}">Göstergeler</button></div></section>`;
  }
  function viewHome() {
    const road = [['Diyaliz yeterliliği', 1], ['Diyaliz reçetesi', 1], ['Volüm ve kan basıncı', 1], ['Anemi', 1], ['KBH-MKB', 1], ['Nutrisyon', 1], ['Potasyum ve asit-baz', 1], ['Damar erişimi / kateter', 1], ['Enfeksiyon ve aşı', 1], ['Tetkik takvimi', 1]];
    return `<header><div class="eyebrow">Kronik diyaliz · aylık izlem ve karar desteği</div><h1>Diyaliz Rehberi</h1>
      <p class="lede">Hemodiyaliz ve periton diyalizi hastalarının aylık değerlendirmesinde hesaplamaları yapar, kılavuza dayalı önerileri gerekçesiyle sunar ve tüm kaydı PDF ile Excel olarak verir.</p>${authors()}</header>
      ${storageOK ? '' : '<p class="note warn">Bu ortamda cihaz belleğine yazılamıyor; girilen veriler sayfa kapanınca kaybolur. Çalışmayı “Veri ve yedek” bölümünden dosyaya alın.</p>'}
      <div class="duo">${modCard('HD')}${modCard('PD')}</div>
      <section><div class="sechead"><h2>Genel</h2></div><div class="grid" style="margin-top:12px">
        <button class="mod" data-go="yon"><b>Diyaliz Yönetmeliği<span class="yr">13.11.2026</span></b><span>Resmî Gazete 33429; tam metin, madde araması</span></button>
        <button class="mod" data-go="veri"><b>Veri ve yedek</b><span>Tüm veriyi Excel’e aktar, yedek al, yedekten yükle</span></button>
        <button class="mod" data-go="kural/HD"><b>Kural tablosu</b><span>Her önerinin koşulu ve dayanağı; onay için</span></button></div></section>
      <section><div class="sechead"><h2>Modüller</h2><span class="cap">Sürüm ${VER}</span></div><ul class="road" style="margin-top:12px">${road.map(r => `<li>${r[0]}<span class="pill ${r[1] ? 'ok' : 'info'}">${r[1] ? 'Hazır' : 'Sırada'}</span></li>`).join('')}</ul></section>
      ${disc()}`;
  }

  /* ---------------- Hasta listesi ---------------- */
  function viewList(m) {
    const ps = byMod(m);
    const cards = ps.map(p => { const a = lastAy(p), ev = a ? D.evaluate(p, a) : null, nb = ev ? ev.recs.filter(r => r.s === 'bad').length : 0, nw = ev ? ev.recs.filter(r => r.s === 'warn').length : 0;
      return `<button class="mod" data-go="p/${p.id}"><b>${esc(p.kod || 'Kodsuz')}<span class="yr">${a ? ayKisa(a) : 'vizit yok'}</span></b><span>${[p.cins, p.dogum ? (new Date().getFullYear() - D.num(p.dogum)) + ' yaş' : '', ev && ev.c.ktv != null ? 'Kt/V ' + D.tr(ev.c.ktv, 2) : ''].filter(Boolean).join(' · ') || '—'}</span>
        <span>${nb ? `<span class="pill bad">${nb} öncelikli</span> ` : ''}${nw ? `<span class="pill warn">${nw} uyarı</span>` : ''}${ev && !nb && !nw && ev.any ? '<span class="pill ok">Uyarı yok</span>' : ''}</span></button>`; }).join('');
    return `<header><div class="eyebrow">${MODN[m]}</div><h1>${m} hastaları</h1><p class="lede">Hasta seçerek aylık vizit kaydını açın. Kayıtlar yalnız bu cihazda tutulur.</p></header>
      <div class="row"><button class="btn pri" data-go="yeni/${m}">+ Yeni ${m} hastası</button><button class="btn" data-go="ozet/${m}">Ünite göstergeleri</button></div>
      ${ps.length ? `<div class="grid">${cards}</div>` : `<div class="empty">Henüz ${m} hastası yok.<br>Yeni hasta ekleyin veya “Veri ve yedek” bölümünden örnek veriyi yükleyin.</div>`}`;
  }
  function viewEdit(m, id) {
    const p = id ? getP(id) : { mod: m };
    return `<header><div class="eyebrow">${MODN[m]}</div><h1>${id ? 'Hasta bilgileri' : 'Yeni ' + m + ' hastası'}</h1></header>
      <section class="calc"><header><b>Kimlik ve temel bilgiler</b><span>KVKK: ad-soyad ve T.C. kimlik numarası girmeyin</span></header><div class="cbody"><div class="fields" id="pform">${D.PFIELDS.filter(f => !f.only || f.only === m).map(f => fieldHTML(f, p[f.k], 'data-pf', 'pf-')).join('')}</div>
      <div class="row"><button class="btn pri" data-act="psave" data-mod="${m}" data-id="${id || ''}">Kaydet</button><button class="btn" data-go="${id ? 'p/' + id : 'list/' + m}">Vazgeç</button>${id ? `<button class="btn danger" data-act="pdel" data-id="${id}" style="margin-left:auto">Hastayı sil</button>` : ''}</div></div></section>`;
  }

  /* ---------------- Hasta sayfası ---------------- */
  function visitForm(p, ay) {
    const v = p.visits[ay];
    const SOLR = /^s(136|227|386|iko|aa)[VHN]$/, SOLS = [['136', '%1,36 glukoz'], ['227', '%2,27 glukoz'], ['386', '%3,86 glukoz'], ['iko', 'İkodekstrin'], ['aa', 'Aminoasit']];
    const cell = k => { const f = D.fieldMap(p.mod)[k]; return `<td><div class="f" data-f="${k}"><input id="v-${k}" data-k="${k}" type="text" inputmode="decimal" autocomplete="off" aria-label="${esc(f.l)}" value="${esc(v[k] == null ? '' : v[k])}"><small data-h=""></small></div></td>`; };
    const solTab = () => `<div class="tbl soltab"><table><thead><tr><th>Solüsyon</th><th>Torba hacmi (L)</th><th>Bekleme (saat)</th><th>Değişim (adet/gün)</th></tr></thead><tbody>${SOLS.map(q => `<tr><td><b>${q[1]}</b></td>${cell('s' + q[0] + 'V')}${cell('s' + q[0] + 'H')}${cell('s' + q[0] + 'N')}</tr>`).join('')}</tbody></table></div><p class="cap">Excel’deki “2L-3H-3D” yazımı: 2 L torba, 3 saat bekleme, günde 3 değişim. Kullanılmayan solüsyonu boş bırakın.</p>`;
    return `<div class="sum" id="sum"></div>` + D.SCHEMA[p.mod].map(g => `<section class="calc" id="g-${g.id}"><header><b>${g.t}</b><span>${esc(g.d || '')}</span></header><div class="cbody">
      <div class="fields">${g.f.filter(f => !SOLR.test(f.k)).map(f => fieldHTML(f, v[f.k], 'data-k', 'v-')).join('')}</div>${g.f.some(f => SOLR.test(f.k)) ? solTab() : ''}<div class="kv" id="out-${g.id}"></div><div class="recs" id="rec-${g.id}"></div></div></section>`).join('') +
      `<section class="calc" id="g-mev"><header><b>${D.GRP.mev}</b><span>Diyaliz Merkezleri Hakkında Yönetmelik</span></header><div class="cbody"><div class="recs" id="rec-mev"></div></div></section>
      <section class="calc"><header><b>Hekim değerlendirmesi ve plan</b><span>Bu ay uygulanan tedavi değişiklikleri</span></header><div class="cbody"><div class="f wide"><label for="v-plan">Plan</label><textarea id="v-plan" data-k="plan" rows="4">${esc(v.plan || '')}</textarea></div></div></section>`;
  }
  function viewPatient(p, ay, tab) {
    const ms = D.sortedMonths(p); if (!ay || !p.visits[ay]) ay = ms[ms.length - 1] || null; tab = tab || 'vizit'; cur.p = p; cur.ay = ay;
    const yas = p.dogum ? (new Date().getFullYear() - D.num(p.dogum)) + ' yaş' : '', vint = D.aylar(p.basla, nowAy());
    const head = `<header><div class="eyebrow"><button class="btn sm" data-go="list/${p.mod}">← ${p.mod} hastaları</button></div><h1>${esc(p.kod || 'Kodsuz')}</h1>
      <p class="lede">${[MODN[p.mod], p.cins, yas, p.boy ? p.boy + ' cm' : '', vint != null ? 'diyalizin ' + vint + '. ayı' : '', p.dm === 'Var' ? 'DM' : ''].filter(Boolean).join(' · ')}</p></header>`;
    const months = `<div class="months noprint">${ms.map(m => `<button class="rt-chip" data-go="p/${p.id}/${m}/${tab}" aria-current="${m === ay}">${ayKisa(m)}</button>`).join('')}
      <span class="row" style="margin-left:auto"><input type="month" id="newAy" value="${nowAy()}" aria-label="Eklenecek ay" style="border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:var(--surface);min-height:36px"><button class="btn sm pri" data-act="addAy">Ay ekle</button></span></div>`;
    const tabs = `<div class="tabs noprint" role="tablist">${[['vizit', 'Aylık vizit'], ['egilim', 'Eğilim'], ['takvim', 'Tetkik takvimi'], ['bilgi', 'Hasta bilgileri']].map(t => `<button role="tab" aria-selected="${tab === t[0]}" data-go="${t[0] === 'bilgi' ? 'yeni/' + p.mod + '/' + p.id : 'p/' + p.id + '/' + (ay || '-') + '/' + t[0]}">${t[1]}</button>`).join('')}</div>`;
    let body;
    if (!ay) body = `<div class="empty">Bu hastada henüz aylık vizit yok. Yukarıdan ayı seçip “Ay ekle” ile başlayın.</div>`;
    else if (tab === 'egilim') body = trend(p);
    else if (tab === 'takvim') body = takvimHTML(p, ay);
    else body = `<div class="sechead"><h2>${ayAd(ay)}</h2><span class="row noprint"><button class="btn sm pri" data-act="exp">PDF / Excel</button><button class="btn sm danger" data-act="delAy">Bu ayı sil</button></span></div>${visitForm(p, ay)}`;
    return head + months + tabs + body + disc();
  }
  function viewQuick(m) {
    const ay = nowAy(); let p = TMP[m]; if (!p) { p = TMP[m] = { id: '_' + m, mod: m, temp: true, kod: 'Hızlı hesap', visits: {} }; p.visits[ay] = {}; }
    const a = Object.keys(p.visits)[0]; cur.p = p; cur.ay = a;
    const dem = D.PFIELDS.filter(f => ['cins', 'dogum', 'boy'].includes(f.k));
    return `<header><div class="eyebrow">${MODN[m]}</div><h1>Hızlı hesap</h1><p class="lede">Hasta kaydı açmadan tek seferlik hesap ve öneri. Girilenler saklanmaz; sayfa yenilenince silinir.</p></header>
      <div class="row noprint"><button class="btn sm pri" data-act="exp">PDF / Excel</button><button class="btn sm" data-act="qreset" data-mod="${m}">Temizle</button></div>
      <section class="calc"><header><b>Hasta özellikleri</b><span>Üre dağılım hacmi (Watson) ve vücut yüzey alanı için</span></header><div class="cbody"><div class="fields">${dem.map(f => fieldHTML(f, p[f.k], 'data-pk', 'pk-')).join('')}</div></div></section>
      ${visitForm(p, a)}${disc()}`;
  }
  /* Çıktı alanlarını (hesap + öneri) yeniler; giriş alanlarına dokunmaz, odak korunur */
  function refresh() {
    const p = cur.p, ay = cur.ay; if (!p || !ay || !p.visits[ay] || !$('#sum')) return;
    const v = p.visits[ay], ev = D.evaluate(p, ay), der = D.derived(p, ev.c), fm = D.fieldMap(p.mod);
    ['yet', 'rec', 'vol', 'kab', 'ane', 'mkb', 'nut', 'eri', 'enf', 'lab', 'mev'].forEach(g => {
      const o = $('#out-' + g); if (o) { const d = der.filter(x => x.g === g); patch(o, d.map(x => [g + '|' + x.l, `<div${typeof x.v === 'string' && x.v.length > 24 ? ' class="kvw"' : ''}><small>${esc(x.l)}</small><strong>${fmt(x.v, x.d)}</strong> ${esc(x.u)}${x.note ? `<em>${esc(x.note)}</em>` : ''}</div>`]), (el, yeni) => pop(el, yeni ? 'dv-new' : 'dv-pop'), !!seen); o.hidden = !d.length; }
      const r = $('#rec-' + g); if (r) { const rs = ev.recs.filter(x => x.g === g); if (!rs.length) { r.innerHTML = g === 'mev' ? '<p class="cap">Bu ay için mevzuat hatırlatması yok.</p>' : ''; } else { if (r.querySelector(':scope > p.cap')) r.innerHTML = ''; patch(r, rs.map(x => [x.id, recHTML(x, v, !p.temp)]), (el, yeni) => { if (yeni && seen && !seen.has(el.dataset.key)) pop(el, 'rec-new'); else if (!yeni) pop(el, 'dv-pop'); }, !!seen); } }
    });
    const bad = new Set(ev.range.map(f => f.k));
    $$('#view .f[data-f]').forEach(el => { const k = el.dataset.f, f = fm[k], sm = el.querySelector('small'); if (!f || !sm || !el.querySelector('[data-k]')) return; const e = bad.has(k); el.classList.toggle('err', e); sm.textContent = e ? `Beklenen aralık ${D.tr(f.mn)}–${D.tr(f.mx)}; hesaba alınmadı` : sm.dataset.h; });
    const ilk = !seen; seen = new Set(ev.recs.map(r => r.id));
    const n = s => ev.recs.filter(r => r.s === s).length;
    const sumOld = $('#sum').textContent;
    $('#sum').innerHTML = ev.any ? [['bad', n('bad')], ['warn', n('warn')], ['info', n('info')], ['ok', n('ok')]].filter(x => x[1]).map(x => `<span class="pill ${x[0]}">${x[1]} ${LVL[x[0]].toLocaleLowerCase('tr')}</span>`).join('') + (ev.prev ? `<span class="cap">Karşılaştırma: ${ayAd(ev.prev)}</span>` : '') : '<span class="cap">Değer girdikçe hesaplar ve öneriler burada ve ilgili bölümün altında görünür.</span>';
    if (!ilk && $('#sum').textContent !== sumOld) $$('#sum .pill').forEach(x => pop(x, 'rt-pop'));
  }
  const TR_ORT = [['Hemoglobin (g/dL)', (c, n) => n('hb'), 1], ['Ferritin (ng/mL)', (c, n) => n('ferritin'), 0], ['TSAT (%)', (c, n) => n('tsat'), 0], ['ESA dozu', (c, n) => n('esaDoz'), 0], ['ERI', c => c.eri, 1], ['Fosfor (mg/dL)', (c, n) => n('p'), 1], ['Düzeltilmiş Ca (mg/dL)', c => c.dca, 2], ['iPTH (pg/mL)', (c, n) => n('pth'), 0], ['iPTH / üst sınır', c => c.pthX, 1], ['nPCR (g/kg/gün)', (c, n) => n('npcr'), 2], ['BMI (kg/m²)', c => c.bmi, 1], ['GNRI', c => c.gnri, 1], ['MIS', (c, n) => n('mis'), 0], ['PEW kategori sayısı', c => c.pewN, 0]];
  const TREND = {
    HD: [['spKt/V', c => c.ktv, 2], ['URR (%)', c => c.urr, 1], ['UF hızı (mL/kg/sa)', c => c.ufr, 1], ['Kilo alımı (%)', c => c.idwg, 1], ['Kuru ağırlık (kg)', (c, n) => n('kuru'), 1], ['Çıkış ağırlığı (kg)', (c, n) => n('postW'), 1], ['Giriş SKB (mmHg)', (c, n) => n('preS'), 0], ['İDH (seans/ay)', (c, n) => n('idh'), 0],
      ...TR_ORT, ['Potasyum (mmol/L)', (c, n) => n('k'), 1], ['Albümin (g/dL)', (c, n) => n('alb'), 1]],
    PD: [['Haftalık Kt/V', c => c.ktv, 2], ['Rezidüel fonksiyon (mL/dk)', c => c.rkf, 1], ['İdrar (mL/gün)', (c, n) => n('idrar'), 0], ['Net UF (mL/gün)', (c, n) => n('uf'), 0], ['Toplam çıkış (mL/gün)', c => c.cikis, 0], ['Ağırlık (kg)', (c, n) => n('kilo'), 1], ['Sistolik KB (mmHg)', (c, n) => n('S'), 0], ['Glukoz yükü (g/gün)', c => c.gluk, 0], ['Günlük solüsyon (L)', c => c.topVol, 1],
      ...TR_ORT, ['Potasyum (mmol/L)', (c, n) => n('k'), 1], ['Albümin (g/dL)', (c, n) => n('alb'), 1]]
  };
  const TDUR = { yok: ['bad', 'Kayıt yok'], gecikti: ['warn', 'Zamanı geldi'], guncel: ['ok', 'Güncel'] };
  function takvimHTML(p, ay) {
    const t = D.takvim(p, ay), n = t.filter(x => x.durum !== 'guncel').length;
    const rows = a => a.map(x => `<tr><td>${esc(x.l)}</td><td class="n">${x.i} ay</td><td>${x.son ? ayKisa(x.son) : '—'}</td><td>${x.sonraki ? ayKisa(x.sonraki) : '—'}</td><td><span class="pill ${TDUR[x.durum][0]}">${TDUR[x.durum][1]}</span></td><td class="cap">${esc(x.src)}</td></tr>`).join('');
    const head = '<thead><tr><th>Tetkik</th><th class="n">Aralık</th><th>Son kayıt</th><th>Sonraki</th><th>Durum</th><th>Dayanak</th></tr></thead>';
    return `<div class="sechead"><h2>Tetkik takvimi</h2><span class="cap">${ayAd(ay)} itibarıyla · ${n} tetkikin zamanı gelmiş veya kaydı yok</span></div>
      <h3>Yönetmelik EK-3</h3><div class="tbl"><table>${head}<tbody>${rows(t.filter(x => x.ek3))}</tbody></table></div>
      <h3>Kılavuz önerileri (EK-3 dışında)</h3><div class="tbl"><table>${head}<tbody>${rows(t.filter(x => !x.ek3))}</tbody></table></div>
      <p class="cap">Kan grubu ile başlangıçtaki HIV ve hepatit testleri ilk kabulde yapılır. ${p.mod === 'HD' ? 'Hepatit göstergeleri negatif hastada HBsAg, anti-HBs ve anti-HCV 3 ayda bir; anti-HBs pozitifse HBsAg ve anti-HBs 6 ayda bir; göstergeler pozitifse yılda bir bakılır.' : 'PET başlangıçtan 4–8 hafta sonra yapılır, sonra klinik gereklilikle yinelenir; bağlantı seti tekrarlayan peritonitten sonra daha erken değiştirilir.'}</p>`;
  }
  function trend(p) {
    const ms = D.sortedMonths(p).slice(-12), cs = ms.map(a => D.compute(p, p.visits[a], a));
    const rows = TREND[p.mod].map(t => { const vals = ms.map((a, i) => t[1](cs[i], k => D.val(p.mod, p.visits[a], k))); return vals.some(x => x != null) ? `<tr><td>${t[0]}</td><td>${spark(vals, 110, 26)}</td>${vals.map(x => `<td class="n">${fmt(x, t[2])}</td>`).join('')}</tr>` : ''; }).join('');
    return `<div class="sechead"><h2>Eğilim</h2><span class="cap">Son ${ms.length} kayıtlı ay</span></div>${rows ? `<div class="tbl"><table><thead><tr><th>Parametre</th><th>Seyir</th>${ms.map(a => `<th class="n">${ayKisa(a)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty">Eğilim için en az bir ayda veri girilmelidir.</div>'}`;
  }

  /* ---------------- Ünite göstergeleri ---------------- */
  function viewKpi(m, ay) {
    const ps = byMod(m), all = [...new Set(ps.flatMap(p => D.sortedMonths(p)))].sort(); if (!ay || !all.includes(ay)) ay = all[all.length - 1];
    if (!ay) return `<header><div class="eyebrow">${MODN[m]}</div><h1>Ünite göstergeleri</h1></header><div class="empty">Gösterge için hasta ve aylık vizit kaydı gerekir.</div>`;
    const act = ps.filter(p => p.visits[ay]), evs = act.map(p => ({ p, ev: D.evaluate(p, ay) }));
    const rows = D.KPI[m].map(k => { let n = 0, ok = 0; evs.forEach(x => { const r = k[1](x.ev.c, kk => D.val(m, x.p.visits[ay], kk), x.p.visits[ay]); if (r != null) { n++; if (r) ok++; } }); const pct = n ? Math.round(ok / n * 100) : null;
      return `<tr><td>${k[0]}</td><td class="n">${ok}/${n}</td><td class="n">${pct == null ? '—' : '%' + pct}</td><td><div class="bar"><i style="width:${pct || 0}%"></i></div></td></tr>`; }).join('');
    const pri = evs.map(x => ({ p: x.p, b: x.ev.recs.filter(r => r.s === 'bad'), w: x.ev.recs.filter(r => r.s === 'warn').length })).filter(x => x.b.length || x.w).sort((a, b) => b.b.length - a.b.length || b.w - a.w);
    return `<header><div class="eyebrow">${MODN[m]}</div><h1>Ünite göstergeleri</h1><p class="lede">${ayAd(ay)}: ${act.length} hastanın vizit kaydı. Payda, ilgili verisi girilmiş hasta sayısıdır.</p></header>
      <div class="months noprint">${all.slice(-12).map(a => `<button class="rt-chip" data-go="ozet/${m}/${a}" aria-current="${a === ay}">${ayKisa(a)}</button>`).join('')}</div>
      <div class="tbl"><table><thead><tr><th>Gösterge</th><th class="n">Hedefte</th><th class="n">Oran</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>${m === 'PD' ? ispdPanel(ps, ay) : ''}
      <section><div class="sechead"><h2>Zamanı gelen tetkikler</h2></div>${(() => { const r = act.map(p => ({ p, t: D.takvim(p, ay).filter(x => x.durum !== 'guncel') })).filter(x => x.t.length); return r.length ? `<div class="tbl" style="margin-top:12px"><table><thead><tr><th>Hasta</th><th>Tetkikler</th></tr></thead><tbody>${r.map(x => `<tr><td><a href="#p/${x.p.id}/${ay}/takvim" data-go="p/${x.p.id}/${ay}/takvim">${esc(x.p.kod)}</a></td><td>${x.t.map(t => esc(t.l)).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="cap" style="margin-top:12px">Tüm tetkikler güncel.</p>'; })()}</section>
      <section><div class="sechead"><h2>Öncelikli hastalar</h2></div>${pri.length ? `<div class="tbl" style="margin-top:12px"><table><thead><tr><th>Hasta</th><th>Öncelikli öneriler</th><th class="n">Uyarı</th></tr></thead><tbody>${pri.map(x => `<tr><td><a href="#p/${x.p.id}/${ay}" data-go="p/${x.p.id}/${ay}">${esc(x.p.kod)}</a></td><td>${x.b.map(r => esc(r.k)).join('; ') || '—'}</td><td class="n">${x.w}</td></tr>`).join('')}</tbody></table></div>` : '<p class="cap" style="margin-top:12px">Bu ay öncelikli öneri veya uyarı yok.</p>'}</section>${disc()}`;
  }

  /* ISPD ünite hedefleri: son 12 ay; ayda en fazla bir atak sayılır */
  function ispdPanel(ps, ay) {
    let ep = 0, kn = 0, esi = 0, ay12 = 0, hasta = 0, temiz = 0;
    ps.forEach(p => { let n = 0, any = false; D.sortedMonths(p).forEach(a => { const d = D.aylar(a, ay); if (d == null || d < 0 || d > 11) return; any = true; ay12++; const v = p.visits[a], l = D.num(v.pLok), pm = D.num(v.pPmn);
      if (v.perit === 'Var' || (l != null && l > 100 && pm != null && pm > 50)) { ep++; n++; if (v.pEtken === 'Kültür negatif') kn++; } if (/Pürülan|Enfekte/.test(v.esi || '')) esi++; }); if (any) { hasta++; if (!n) temiz++; } });
    if (!ay12) return '';
    const py = ay12 / 12, rate = ep / py, er = esi / py, f = (x, d) => D.tr(Math.round(x * 100) / 100, d);
    const row = (l, val, hedef, ok) => `<tr><td>${l}</td><td class="n">${val}</td><td class="n">${hedef}</td><td>${ok == null ? '—' : `<span class="pill ${ok ? 'ok' : 'warn'}">${ok ? 'Hedefte' : 'Hedef dışı'}</span>`}</td></tr>`;
    return `<section><div class="sechead"><h2>ISPD ünite hedefleri</h2><span class="cap">Son 12 ay · ${f(py, 1)} hasta-yılı</span></div><div class="tbl" style="margin-top:12px"><table><thead><tr><th>Gösterge</th><th class="n">Değer</th><th class="n">Hedef</th><th></th></tr></thead><tbody>
      ${row('Peritonit hızı', f(rate, 2) + ' atak/hasta-yılı (' + ep + ' atak)', '≤ 0,40', rate <= 0.4)}
      ${row('Kültür negatif peritonit', ep ? '%' + Math.round(kn / ep * 100) : '—', '< %15', ep ? kn / ep < 0.15 : null)}
      ${row('Peritonitsiz hasta oranı', '%' + Math.round(temiz / hasta * 100) + ' (' + temiz + '/' + hasta + ')', '> %80', temiz / hasta > 0.8)}
      ${row('Çıkış yeri enfeksiyonu hızı', f(er, 2) + ' atak/hasta-yılı', '≤ 0,40', er <= 0.4)}</tbody></table></div>
      <p class="cap">ISPD Peritonit 2022 (1C, 2C) ve Kateter enfeksiyonu 2023 (1C). Hasta-yılı, kayıtlı vizit aylarından hesaplanır; aynı ayda birden fazla atak tek sayılır.</p></section>`;
  }
  /* ---------------- Kural tablosu ---------------- */
  function viewRules(m) {
    const gs = ['yet', 'rec', 'vol', 'kab', 'ane', 'mkb', 'nut', 'eri', 'enf', 'mev'];
    return `<header><div class="eyebrow">${MODN[m]}</div><h1>Kural tablosu</h1><p class="lede">Uygulamanın ${m} için verdiği her önerinin koşulu, metni ve dayanağı. Eşikler ve metinler bu tablodan yönetilir.</p></header>
      <p class="note warn">Sürüm ${VER}: anemi kuralları KDIGO Anemi 2026, KBH-MKB kuralları KDIGO 2017 metninden (KDIGO KBH KILAVUZLARI not defteri) alınmıştır. Yeterlilik, reçete ve volüm eşikleri KDOQI, ISPD ve EBPG’ye dayanır ve Nefroloji Kaynaklar eBook not defteriyle karşılaştırılmıştır; nutrisyon, damar erişimi, peritonit ve aşı kuralları aynı defterin kaynaklarına, hepatit taraması CDC ve KDIGO HCV 2022’ye, potasyum kuralları KDIGO tartışmalar konferansına dayanır. Tüm kurallar yazar onayı bekliyor. Düzeltme için tabloyu Excel’e alıp satır bazında not düşebilirsiniz.</p>
      <div class="row"><button class="btn pri" data-act="expRules">Kural tablosunu Excel’e aktar</button><button class="btn" data-go="kural/${m === 'HD' ? 'PD' : 'HD'}">${m === 'HD' ? 'PD' : 'HD'} kurallarına geç</button></div>
      ${gs.map(g => { const rs = D.RULES[m].filter(r => r.g === g); return rs.length ? `<section><div class="sechead"><h2>${D.GRP[g]}</h2><span class="cap">${rs.length} kural</span></div><div class="tbl" style="margin-top:12px"><table><thead><tr><th>Kod</th><th>Koşul</th><th>Öneri</th><th>Dayanak</th></tr></thead><tbody>${rs.map(r => `<tr><td style="white-space:nowrap"><span class="pill ${r.s}">${r.id}</span></td><td>${esc(r.k)}</td><td>${esc(ruleText(r))}</td><td>${esc(r.src)}</td></tr>`).join('')}</tbody></table></div></section>` : ''; }).join('')}${disc()}`;
  }

  const OX = { c: {}, v: {}, p: {}, n: () => null, prevOf: () => null };
  const ruleText = r => { if (typeof r.o !== 'function') return r.o; try { return r.o(OX); } catch (e) { return '(metin hasta verisine göre oluşturulur)'; } };
  /* ---------------- Yönetmelik ---------------- */
  const KEYART = ['Madde 6', 'Madde 22', 'Madde 23', 'Madde 31', 'Madde 32', 'Geçici Madde 2', 'EK-3', 'EK-6'];
  function yonList(q) {
    const A = window.YONETMELIK || [], ql = (q || '').toLocaleLowerCase('tr'), hl = s => { s = esc(s); if (ql.length < 2) return s; const i = s.toLocaleLowerCase('tr').indexOf(ql); return i < 0 ? s : s.slice(0, i) + '<mark>' + s.slice(i, i + ql.length) + '</mark>' + s.slice(i + ql.length); };
    let b = '', out = '', n = 0;
    A.forEach(a => { const txt = (a.no + ' ' + a.t + ' ' + a.p.join(' ')).toLocaleLowerCase('tr'); if (ql.length >= 2 && !txt.includes(ql)) return; n++;
      if (a.b !== b) { b = a.b; out += `<h3 style="margin-top:14px">${esc(b)}</h3>`; }
      out += `<details class="md${KEYART.includes(a.no) ? ' key' : ''}" id="y-${a.no.replace(/\s/g, '')}" ${ql.length >= 2 ? 'open' : ''}><summary><i>${a.no}</i><span>${hl(a.t)}</span></summary>${a.p.map(p => `<p>${hl(p)}</p>`).join('')}</details>`; });
    return n ? out : '<div class="empty">Aramayla eşleşen madde yok.</div>';
  }
  function viewYon() {
    return `<header><div class="eyebrow">Mevzuat · Sağlık Bakanlığı</div><h1>Diyaliz Merkezleri Hakkında Yönetmelik</h1><p class="lede">Resmî Gazete, 13 Kasım 2026, Sayı 33429. Yayımı tarihinde yürürlüğe girmiş; 1.3.2019 tarihli ve 30701 sayılı yönetmeliği yürürlükten kaldırmıştır.</p></header>
      <p class="note">Hasta izlemini doğrudan ilgilendiren maddeler “klinik izlem” etiketiyle işaretlidir: aylık uzman tabip değerlendirmesi (Madde 23), rapor içeriği ve PD uygulanmama gerekçesi (Madde 22), üç ay içinde nakil merkezine yönlendirme (Madde 31), hasta takip dosyası ve tetkik kayıtları (Madde 32), ev hemodiyalizi (Madde 6).</p>
      <div class="row">${KEYART.map(k => `<button class="rt-chip" data-act="yjump" data-id="y-${k.replace(/\s/g, '')}">${k}</button>`).join('')}</div>
      <div class="f"><label for="yq">Yönetmelikte ara</label><input id="yq" type="search" placeholder="ör. rapor, sertifikalı, reuse, ev hemodiyalizi" autocomplete="off"></div>
      <div id="ylist" style="display:flex;flex-direction:column;gap:6px">${yonList('')}</div>
      <p class="cap">Ana metin Resmî Gazete’de yayımlanan metindir. Eklerden EK-3 (tetkikler) ve EK-6 (zorunlu ilaçlar) yer alır; ekler Resmî Gazete ek PDF’inden aktarılmıştır. Bağlayıcı olan Resmî Gazete metnidir.</p>`;
  }

  /* ---------------- Veri ve yedek ---------------- */
  function viewVeri() {
    const nv = S.patients.reduce((a, p) => a + Object.keys(p.visits || {}).length, 0);
    return `<header><div class="eyebrow">Genel</div><h1>Veri ve yedek</h1><p class="lede">${byMod('HD').length} HD ve ${byMod('PD').length} PD hastası, ${nv} aylık vizit kaydı. Veriler yalnız bu cihazın tarayıcı belleğinde tutulur; hiçbir yere gönderilmez.</p></header>
      ${storageOK ? '' : '<p class="note warn">Bu ortamda cihaz belleğine yazılamıyor. Verileri dosya olarak yedekleyin.</p>'}
      <section class="calc"><header><b>Dışa aktar</b><span>Excel ve yedek dosyası cihazda oluşturulur</span></header><div class="cbody"><div class="row"><button class="btn pri" data-act="expAll">Tüm veriyi Excel’e aktar</button><button class="btn" data-act="backup">Yedek dosyası al (.json)</button></div>
        <p class="cap">Excel dosyası: Hastalar, HD vizitleri, PD vizitleri (her satır bir hasta-ay; girilen ve hesaplanan değerler), Öneriler ve hekim kararları. Tek hastanın aylık PDF özeti hasta sayfasındaki “PDF / Excel” düğmesindedir.</p></div></section>
      <section class="calc"><header><b>Yedekten yükle</b><span>Cihaz değişikliği veya tarayıcı verisi silinmesi için</span></header><div class="cbody"><div class="row"><input type="file" id="rfile" accept=".json,application/json"><button class="btn" data-act="restore">Yükle</button></div><p class="cap">Yükleme, bu cihazdaki mevcut kaydın yerine geçer. Tarayıcı verileri temizlenirse kayıtlar silinir; düzenli yedek alınması önerilir.</p></div></section>
      <section class="calc"><header><b>Örnek veri ve sıfırlama</b><span>Uygulamayı tanımak için kurgusal hastalar</span></header><div class="cbody"><div class="row"><button class="btn" data-act="demo">Örnek hastaları ekle (2 HD, 2 PD)</button><button class="btn danger" data-act="wipe" style="margin-left:auto">Tüm veriyi sil</button></div></div></section>
      <p class="note">KVKK: Hasta kodu alanına ad-soyad veya kimlik numarası yazmayın. Dışa aktarılan dosyalar kişisel sağlık verisi içerebilir; kurum kurallarına göre saklayın.</p>`;
  }
  function viewAbout() {
    return `<header><div class="eyebrow">Genel</div><h1>Hakkında</h1><p class="lede">Diyaliz hekimleri ve nefrologlar için, kronik hemodiyaliz ve periton diyalizi hastalarının aylık izlem ve tedavi planlamasına yönelik karar desteği.</p>${authors()}</header>
      <section><div class="sechead"><h2>Dayanaklar</h2></div><ul style="margin:12px 0 0;padding-left:1.2rem;display:flex;flex-direction:column;gap:4px;max-width:76ch">
        <li>KDOQI Hemodiyaliz Yeterliliği Kılavuzu, 2015 güncellemesi (Am J Kidney Dis 2015;66:884-930) ve 2006 sürümü</li><li>Avrupa En İyi Uygulama Kılavuzları (EBPG/ERBP): hemodiyaliz stratejileri ve hemodinamik instabilite, 2007; periton diyalizi, 2005</li>
        <li>KDIGO Tartışmalar Konferansları: diyalizde kan basıncı ve volüm yönetimi (2020); potasyum yönetimi (2020)</li><li>KDIGO Anemi Kılavuzu, 2026</li><li>KDIGO KBH-MKB Kılavuzu, 2017 güncellemesi</li>
        <li>ISPD: yüksek kaliteli, hedefe yönelik periton diyalizi reçetelendirme (Perit Dial Int 2020;40:244-253); kardiyovasküler ve metabolik kılavuz (2015); membran disfonksiyonu (2021); peritonit (2022)</li>
        <li>ISRNM protein-enerji kaybı uzlaşısı (Fouque ve ark., Kidney Int 2008); Nutrition in Kidney Disease; Oxford Handbook of Dialysis</li><li>KDOQI Damar Erişimi Kılavuzu, 2019; Interventional Nephrology</li><li>ISPD: peritonit (2022), kateter ilişkili enfeksiyon (2023), membran disfonksiyonu (2021), hedefe yönelik reçete (2020); ISRNM–ISPD PD’de nutrisyon (2026)</li><li>CDC diyaliz ünitelerinde enfeksiyon önlemleri; KDIGO HCV 2022; KDIGO Nakil Adayı 2020</li><li>ERA-EDTA/ESH uzlaşısı: diyaliz hastalarında hipertansiyon (Sarafidis ve ark., Nephrol Dial Transplant 2017)</li><li>Diyaliz Merkezleri Hakkında Yönetmelik, Resmî Gazete 13.11.2026, Sayı 33429</li></ul></section>
      <section><div class="sechead"><h2>Hesaplamalar</h2></div><div class="tbl" style="margin-top:12px"><table><thead><tr><th>Hesap</th><th>Formül</th></tr></thead><tbody>
        <tr><td>spKt/V (Daugirdas II)</td><td>−ln(R − 0,008 × t) + (4 − 3,5 × R) × UF / W; R: çıkış/giriş üre, t: saat, UF: litre, W: çıkış ağırlığı (kg)</td></tr>
        <tr><td>eKt/V</td><td>spKt/V × t / (t + 30,7); t: dakika (uyarlanmış Tattersall)</td></tr><tr><td>stdKt/V</td><td>Leypoldt eşitliği (sabit hacim); ultrafiltrasyon ve rezidüel fonksiyon katkısı eklenmez</td></tr>
        <tr><td>UF hızı</td><td>UF (mL) / süre (saat) / çıkış ağırlığı (kg)</td></tr><tr><td>Üre dağılım hacmi</td><td>Watson: erkek 2,447 − 0,09516 × yaş + 0,1074 × boy + 0,3362 × kg; kadın −2,097 + 0,1069 × boy + 0,2466 × kg</td></tr>
        <tr><td>PD haftalık Kt/V</td><td>(D/P üre × 24 sa drenaj hacmi × 7) / V + (İ/P üre × idrar hacmi × 7) / V</td></tr><tr><td>PD haftalık kreatinin klirensi</td><td>Periton klirensi + renal klirens (üre ve kreatinin klirensi ortalaması); 1,73 m² vücut yüzeyine (DuBois) düzeltilir</td></tr>
        <tr><td>ESA direnç indeksi</td><td>Haftalık ESA dozu (IU) / kg / Hb (g/dL); darbepoetin için 1 µg ≈ 200 IU kabul edilir, CERA için hesaplanmaz</td></tr><tr><td>iPTH / üst sınır</td><td>iPTH ÷ laboratuvar üst sınırı (girilmezse 65 pg/mL); hedef 2–9 ×</td></tr><tr><td>GNRI</td><td>1,489 × albümin (g/L) + 41,7 × (ağırlık / ideal ağırlık); ideal ağırlık = 22 × boy² (m); oran 1’i aşarsa 1 alınır</td></tr><tr><td>PEW (ISRNM)</td><td>Biyokimya (albümin < 3,8, prealbümin < 30, kolesterol < 100), vücut kitlesi (BMI < 22 / ≥ 65 yaşta < 23, kilo kaybı 3 ayda > %5 veya 6 ayda > %10), kas kitlesi (uygulamada ölçülmez), diyet alımı (nPCR veya protein < 0,8 g/kg/gün, enerji < 25 kcal/kg/gün); ≥ 3 kategori PEW</td></tr><tr><td>Diyalizattan emilen glukoz enerjisi</td><td>Glukoz yükü × emilim (SAPD %60, APD %40) × 3,75 kcal/g</td></tr><tr><td>Glukoz yükü</td><td>%1,36: 13,6 g/L; %2,27: 22,7 g/L; %3,86: 38,6 g/L</td></tr><tr><td>Düzeltilmiş kalsiyum</td><td>Ca + 0,8 × (4 − albümin)</td></tr></tbody></table></div></section>
      <section><div class="sechead"><h2>Çalışma ilkeleri</h2></div><ul style="margin:12px 0 0;padding-left:1.2rem;display:flex;flex-direction:column;gap:4px;max-width:76ch"><li>Girilmeyen değer sıfır sayılmaz; kural yalnız gerekli veriler varsa çalışır.</li><li>Beklenen aralığın dışındaki giriş işaretlenir ve hesaba alınmaz.</li><li>Reçete alanları yeni aya taşınır; laboratuvar ve ölçüm alanları taşınmaz.</li><li>Her öneri koşulu, tetikleyen değeri ve dayanağıyla gösterilir; hekim kararı kayda geçer.</li><li>Tüm veriler cihazda kalır; PDF ve Excel dosyaları cihazda üretilir.</li></ul></section>${disc()}`;
  }

  /* ---------------- Dışa aktarma ---------------- */
  const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const stampName = (b, ext) => { const d = new Date(), p = n => ('0' + n).slice(-2); return b + '_' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '.' + ext; };
  function patientItems(p, ay) {
    const v = p.visits[ay], ev = D.evaluate(p, ay), der = D.derived(p, ev.c), it = [];
    it.push({ title: 'Hasta ve dönem', inputs: [['Hasta kodu', p.kod || '—'], ['Yöntem', MODN[p.mod]], ['Dönem', ayAd(ay)]].concat(D.PFIELDS.filter(f => !['kod'].includes(f.k) && (!f.only || f.only === p.mod) && p[f.k] != null && p[f.k] !== '').map(f => [f.l, f.t === 'm' ? ayAd(p[f.k]) : p[f.k], f.u || ''])) });
    D.SCHEMA[p.mod].forEach(g => { const ins = g.f.filter(f => v[f.k] != null && v[f.k] !== '').map(f => [f.l, v[f.k], f.u || '']), res = der.filter(x => x.g === g.id).map(x => [x.l, fmt(x.v, x.d), x.u, x.note]), nt = ev.recs.filter(r => r.g === g.id).map(r => recLine(r, v)); if (ins.length || res.length || nt.length) it.push({ title: g.t, inputs: ins, results: res, notes: nt }); });
    const mv = ev.recs.filter(r => r.g === 'mev'); if (mv.length) it.push({ title: D.GRP.mev, notes: mv.map(r => recLine(r, v)) });
    const tk = D.takvim(p, ay); if (tk.length) it.push({ title: 'Tetkik takvimi', results: tk.map(x => [x.l, x.durum === 'guncel' ? 'Güncel' : x.durum === 'gecikti' ? 'Zamanı geldi' : 'Kayıt yok', '', 'Aralık ' + x.i + ' ay; son ' + (x.son ? ayAd(x.son) : '—') + '; sonraki ' + (x.sonraki ? ayAd(x.sonraki) : '—')]) });
    if (v.plan) it.push({ title: 'Hekim değerlendirmesi ve plan', text: String(v.plan).split('\n'), textTitle: 'Plan' });
    return it;
  }
  const karAd = k => k === 'e' ? 'Uygun bulundu' : k === 'h' ? 'Uygulanmadı' : '';
  const recLine = (r, v) => `[${LVL[r.s]}] ${r.k}${r.why ? ' (' + r.why + ')' : ''}: ${r.o} Dayanak: ${r.src}.${(v.kar || {})[r.id] ? ' Hekim kararı: ' + karAd(v.kar[r.id]) + '.' : ''}`;
  function exportPatient() { const p = cur.p, ay = cur.ay; if (!p || !ay) return; const label = (p.kod || '') + ' · ' + ayAd(ay); DA.open(patientItems(p, ay), label); const el = $('#da-pt'); if (el) { el.value = label; el.dispatchEvent(new Event('input', { bubbles: true })); } }
  const DKEYS = { HD: [['ktv', 'spKt/V'], ['urr', 'URR (%)'], ['ekt', 'eKt/V'], ['std', 'stdKt/V'], ['uf', 'UF hacmi (L)'], ['ufr', 'UF hızı (mL/kg/saat)'], ['idwg', 'Kilo alımı (% kuru ağırlık)'], ['dKuru', 'Çıkış − kuru ağırlık (kg)'], ['esaKg', 'ESA (IU/kg/hafta)'], ['eri', 'ERI'], ['dca', 'Düzeltilmiş Ca (mg/dL)'], ['pthX', 'iPTH / üst sınır'], ['bmi', 'BMI'], ['gnri', 'GNRI'], ['wl6', '6 ayda kilo kaybı (%)'], ['pewN', 'PEW kategori sayısı']],
    PD: [['ktv', 'Haftalık toplam Kt/V'], ['pKtV', 'Periton Kt/V'], ['rKtV', 'Renal Kt/V'], ['tCrCl', 'Haftalık CrCl (L/1,73 m²)'], ['rkf', 'Rezidüel fonksiyon (mL/dk/1,73 m²)'], ['petTip', 'PET transport tipi'], ['topVol', 'Toplam solüsyon (L/gün)'], ['gluk', 'Glukoz yükü (g/gün)'], ['cikis', 'Toplam sıvı çıkışı (mL/gün)'], ['dHedef', 'Ağırlık − hedef (kg)'], ['esaKg', 'ESA (IU/kg/hafta)'], ['eri', 'ERI'], ['dca', 'Düzeltilmiş Ca (mg/dL)'], ['pthX', 'iPTH / üst sınır'], ['bmi', 'BMI'], ['gnri', 'GNRI'], ['wl6', '6 ayda kilo kaybı (%)'], ['pewN', 'PEW kategori sayısı'], ['glukKcal', 'Diyalizattan glukoz (kcal/gün)']] };
  function allSheets() {
    const pf = D.PFIELDS, sh = [];
    sh.push({ name: 'Hastalar', head: 1, widths: [14, 16].concat(pf.slice(1).map(() => 20), [10]), rows: [['Hasta kodu', 'Yöntem'].concat(pf.slice(1).map(f => f.l + (f.u ? ' (' + f.u + ')' : '')), ['Vizit sayısı'])].concat(S.patients.map(p => [p.kod, MODN[p.mod]].concat(pf.slice(1).map(f => p[f.k] == null ? '' : p[f.k]), [Object.keys(p.visits || {}).length]))) });
    const recRows = [['Hasta kodu', 'Yöntem', 'Dönem', 'Kural', 'Bölüm', 'Düzey', 'Koşul', 'Tetikleyen değer', 'Öneri', 'Dayanak', 'Hekim kararı']];
    ['HD', 'PD'].forEach(m => { const fs = D.fieldsOf(m), rows = [['Hasta kodu', 'Dönem'].concat(fs.map(f => f.l + (f.u ? ' (' + f.u + ')' : '')), DKEYS[m].map(k => 'Hesap: ' + k[1]), ['Öncelikli öneri', 'Uyarı', 'Hekim planı'])];
      byMod(m).forEach(p => D.sortedMonths(p).forEach(a => { const v = p.visits[a], ev = D.evaluate(p, a);
        rows.push([p.kod, a].concat(fs.map(f => f.t === 'n' ? (D.num(v[f.k]) == null ? '' : D.num(v[f.k])) : (v[f.k] == null ? '' : v[f.k])), DKEYS[m].map(k => ev.c[k[0]] == null ? '' : ev.c[k[0]]), [ev.recs.filter(r => r.s === 'bad').length, ev.recs.filter(r => r.s === 'warn').length, v.plan || '']));
        ev.recs.forEach(r => recRows.push([p.kod, m, a, r.id, D.GRP[r.g], LVL[r.s], r.k, r.why, r.o, r.src, karAd((v.kar || {})[r.id])])); }));
      sh.push({ name: m + ' vizitleri', head: 1, widths: [14, 10].concat(fs.map(() => 14), DKEYS[m].map(() => 14), [10, 8, 50]), rows }); });
    sh.push({ name: 'Öneriler', head: 1, widths: [14, 8, 10, 10, 22, 10, 40, 24, 80, 40, 16], rows: recRows });
    sh.push({ name: 'Bilgi', head: 0, widths: [22, 90], rows: [['Uygulama', 'Diyaliz Rehberi, sürüm ' + VER], ['Hazırlayan', AUT], ['Oluşturma', new Date().toLocaleString('tr-TR')], ['Uyarı', 'Klinik karar desteği amaçlıdır; hasta özelinde hekim değerlendirmesinin yerini tutmaz.'], ['Veri gizliliği', 'Dosya cihazda oluşturulmuştur. Kişisel sağlık verisi içerebilir; KVKK ve kurum kurallarına göre saklayın.']] });
    return sh;
  }
  function ruleSheets() { return ['HD', 'PD'].map(m => ({ name: m + ' kuralları', head: 1, widths: [10, 24, 10, 44, 90, 44, 30], rows: [['Kod', 'Bölüm', 'Düzey', 'Koşul', 'Öneri', 'Dayanak', 'Yazar notu / onay']].concat(D.RULES[m].map(r => [r.id, D.GRP[r.g], LVL[r.s], r.k, ruleText(r), r.src, ''])) })); }
  function saveBytes(bytes, name, mime) { try { DA.save(bytes, name, mime).then(r => { if (r === 'saved') DA.toast(name + ' indirildi'); }); } catch (e) { DA.toast('Dosya oluşturulamadı'); } }

  /* ---------------- Örnek veri ---------------- */
  function demo() {
    const id = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), n = nowAy(), mAgo = k => { const d = new Date(parseInt(n.slice(0, 4), 10), parseInt(n.slice(5, 7), 10) - 1 - k, 1); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); };
    const ENFD = { hbsag: 'Negatif', antiHbs: 85, antiHcv: 'Negatif', antiHiv: 'Negatif', hbvAsi: 'Seri tamamlandı', gripAy: '2025-10', pnomo: 'Yok', zona: 'Yok' };
    const MKBHD = { esa: 'Epoetin alfa/beta', esaDoz: 6000, demir: 'IV demir sükroz', demirDoz: 400, hifphi: 'Yok', caBag: 'Kalsiyum asetat', caBagEl: 1000, nonCa: 'Yok', vitD: 'Kalsitriol', vitDDoz: 1.5, kalsim: 'Yok', pthUst: 65 };
    const rHD = { sure: 240, seans: 3, erisim: 'AV fistül', igne: '16G', qb: 320, qd: 500, membran: 'HD, high-flux', yuzey: 1.8, dK: 2, dCa: '1.5', dHCO3: 32, dNa: 138, dT: 36.5, antiko: 'Standart heparin', antikoDoz: '2000 IU bolus + 1000 IU/saat', kuru: 70, ahSayi: 1 };
    const a = { id: id(), mod: 'HD', kod: 'ÖRNEK-HD-01', cins: 'Erkek', dogum: 1961, boy: 172, basla: mAgo(30), dm: 'Var', nakil: 'Değerlendirilmedi', visits: {} };
    a.visits[mAgo(2)] = Object.assign({}, rHD, MKBHD, ENFD, { erisim: 'AV fistül', igne: '16G', qa: 820, preU: 138, postU: 42, idrar: 300, preW: 72.6, postW: 70.2, preS: 148, preD: 84, postS: 132, postD: 78, idh: 0, odem: 'Yok', hb: 10.8, ferritin: 420, tsat: 26, ca: 8.9, p: 5.2, alb: 3.8, pth: 380, k: 5.1, hco3: 22 });
    a.visits[mAgo(1)] = Object.assign({}, rHD, MKBHD, { preU: 142, postU: 47, idrar: 250, preW: 73.4, postW: 70.4, preS: 156, preD: 88, postS: 138, postD: 80, idh: 1, nadir: 96, odem: 'Yok', hb: 10.4, ferritin: 390, tsat: 24, ca: 9.0, p: 5.8, alb: 3.7, pth: 410, k: 5.4, hco3: 21 });
    a.visits[n] = Object.assign({}, rHD, MKBHD, { erisim: 'AV fistül', igne: '16G', qa: 560, fm: 'Uzamış kanama (> 15 dk)', resirk: 12, kBag: 'Yok', kIlac: 'RAAS blokeri', hbvAsi: 'Seri tamamlandı', gripAy: '2025-10', pnomo: 'Yok', zona: 'Yok', sure: 210, qb: 280, preU: 150, postU: 62, idrar: 150, preW: 74.6, postW: 71.0, preS: 168, preD: 92, postS: 146, postD: 84, evS: 148, evD: 88, idh: 3, nadir: 86, odem: '+', ahSayi: 3, hb: 9.8, ferritin: 350, tsat: 19, ca: 9.2, p: 6.4, alb: 3.5, pth: 720, k: 5.9, hco3: 19, npcr: 0.85, mis: 7, sga: 'B: hafif-orta malnütrisyon', istah: 'Azalmış', ons: 'Yok', crp: 12, demir: 'Yok', demirDoz: '' });
    const b = { id: id(), mod: 'HD', kod: 'ÖRNEK-HD-02', cins: 'Kadın', dogum: 1975, boy: 160, basla: mAgo(8), dm: 'Yok', nakil: 'Bekleme listesinde', pdgerekce: 'Geçirilmiş batın cerrahisi, yaygın yapışıklık', visits: {} };
    b.visits[n] = Object.assign({}, rHD, MKBHD, ENFD, { erisim: 'Tünelli kateter', igne: 'Kateter', katBas: mAgo(7), kilit: '%4 sitrat', alteplaz: 2, gripAy: n, pnomo: 'PCV20', kuru: 58, qb: 350, igne: '15G', membran: 'HDF, post-dilüsyon', konv: 24, dK: 3, preU: 120, postU: 30, idrar: 0, preW: 59.6, postW: 58.1, preS: 128, preD: 76, postS: 120, postD: 72, idh: 0, odem: 'Yok', ahSayi: 0, hb: 11.4, ferritin: 510, tsat: 31, ca: 9.1, p: 4.6, alb: 4.1, pth: 290, k: 4.6, hco3: 23, esa: 'Darbepoetin alfa', esaDoz: 20, demir: 'Yok', nonCa: 'Sevelamer', caBag: 'Yok', vitD: 'Yok', kalsim: 'Sinakalset', kalsimDoz: 30, pthUst: 65 });
    const rPD = { tip: 'SAPD', s136V: 2, s136H: 4, s136N: 3, s227V: 2, s227H: 8, s227N: 1, hedef: 64, furo: 0, raas: 'Yok', ahSayi: 1 };
    const c = { id: id(), mod: 'PD', kod: 'ÖRNEK-PD-01', cins: 'Kadın', dogum: 1968, boy: 158, basla: mAgo(20), dm: 'Var', nakil: 'Nakil merkezine yönlendirildi', visits: {} };
    c.visits[mAgo(4)] = Object.assign({}, rPD, { perit: 'Var', pLok: 900, pPmn: 88, pEtken: 'Koagülaz negatif stafilokok', pYanit: 'Düzeldi', dVol: 9.2, dUre: 104, pUre: 118, uUre: 520, dKre: 5.6, pKre: 8.4, uKre: 46, idrar: 900, pet: 0.72, petUF: 520, kilo: 64.5, uf: 700, S: 136, D: 82, odem: 'Yok', hb: 11.0, ferritin: 160, tsat: 22, ca: 8.8, p: 4.9, alb: 3.6, pth: 310, k: 4.1, hco3: 24, esa: 'Darbepoetin alfa', esaDoz: 30, demir: 'Oral demir', caBag: 'Kalsiyum karbonat', caBagEl: 800, nonCa: 'Yok', vitD: 'Yok', kalsim: 'Yok', pthUst: 65 });
    c.visits[n] = Object.assign({}, rPD, ENFD, { esi: 'Yalnız kızarıklık / kabuklanma', profil: 'Yok', pSay: 1, kFonk: 'Normal', kBag: 'Yok', s136V: 2, s136H: 4, s136N: 2, s227V: 2, s227H: 4, s227N: 1, s386V: 2, s386H: 8, s386N: 1, dVol: 9.4, dUre: 108, pUre: 132, uUre: 480, dKre: 6.0, pKre: 9.6, uKre: 40, idrar: 450, pet: 0.84, petUF: 340, kilo: 66.8, uf: 350, S: 152, D: 94, odem: '+', hb: 10.2, ferritin: 140, tsat: 18, npcr: 0.9, mis: 8, ons: 'Yok', ca: 8.6, p: 5.6, alb: 3.2, pth: 420, k: 3.3, hco3: 21, d25: 14, esa: 'Darbepoetin alfa', esaDoz: 30, demir: 'Yok', caBag: 'Kalsiyum karbonat', caBagEl: 800, nonCa: 'Yok', vitD: 'Yok', kalsim: 'Yok', natD: 'Yok', pthUst: 65 });
    const d = { id: id(), mod: 'PD', kod: 'ÖRNEK-PD-02', cins: 'Erkek', dogum: 1982, boy: 176, basla: mAgo(5), dm: 'Yok', nakil: 'Bekleme listesinde', visits: {} };
    d.visits[n] = { tip: 'APD', s136V: 5, s136H: 1.5, s136N: 2, s227V: 2.5, s227H: 1.5, s227N: 1, sikoV: 2, sikoH: 14, sikoN: 1, gunduz: 2, gece: 9, hedef: 78, furo: 250, raas: 'ARB', ahSayi: 1, ktvlab: 2.1, idrar: 1200, pet: 0.66, kilo: 78.4, uf: 900, S: 128, D: 78, odem: 'Yok', hb: 11.6, ferritin: 320, tsat: 28, ca: 9.0, p: 4.8, alb: 3.9, pth: 260, k: 4.4, hco3: 25, esa: 'Yok', demir: 'Yok', caBag: 'Yok', nonCa: 'Sevelamer', vitD: 'Yok', kalsim: 'Yok', pthUst: 65 };
    S.patients.push(a, b, c, d); save();
  }

  /* ---------------- Olaylar ---------------- */
  function arm(btn, txt) { if (btn.dataset.armed) return true; btn.dataset.armed = '1'; btn.dataset.old = btn.textContent; btn.textContent = txt || 'Emin misiniz? Yeniden basın'; setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = btn.dataset.old; } }, 4000); return false; }
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); go(g.dataset.go); return; }
    const b = e.target.closest('[data-act]'); if (!b) return; const act = b.dataset.act, p = cur.p, ay = cur.ay;
    if (act === 'kar') { const v = p.visits[ay]; v.kar = v.kar || {}; if (v.kar[b.dataset.id] === b.dataset.val) delete v.kar[b.dataset.id]; else v.kar[b.dataset.id] = b.dataset.val; save(); refresh(); }
    else if (act === 'addAy') { const a = ($('#newAy') || {}).value; if (!/^\d{4}-\d{2}$/.test(a || '')) { DA.toast('Geçerli bir ay seçin'); return; } if (!p.visits[a]) { newVisit(p, a); save(); } go('p/' + p.id + '/' + a); }
    else if (act === 'delAy') { if (!arm(b)) return; delete p.visits[ay]; save(); go('p/' + p.id); }
    else if (act === 'exp') exportPatient();
    else if (act === 'qreset') { delete TMP[b.dataset.mod]; go('hizli/' + b.dataset.mod); }
    else if (act === 'psave') { const m = b.dataset.mod, id = b.dataset.id; let q = id ? getP(id) : { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), mod: m, visits: {} };
      $$('#pform [data-pf]').forEach(el => { const k = el.dataset.pf, val = el.value.trim(); if (val === '') delete q[k]; else q[k] = val; });
      if (!q.kod) { DA.toast('Hasta kodu girin'); return; } if (!id) S.patients.push(q); save(); go('p/' + q.id); }
    else if (act === 'pdel') { if (!arm(b)) return; const q = getP(b.dataset.id); S.patients = S.patients.filter(x => x !== q); save(); go('list/' + q.mod); }
    else if (act === 'expAll') { if (!S.patients.length) { DA.toast('Aktarılacak kayıt yok'); return; } saveBytes(DA.sheets(allSheets()), stampName('DiyalizRehberi_TumVeri', 'xlsx'), XLSX); }
    else if (act === 'expRules') saveBytes(DA.sheets(ruleSheets()), stampName('DiyalizRehberi_KuralTablosu', 'xlsx'), XLSX);
    else if (act === 'backup') saveBytes(new TextEncoder().encode(JSON.stringify({ app: 'DiyalizRehberi', v: 1, t: new Date().toISOString(), data: S })), stampName('DiyalizRehberi_Yedek', 'json'), 'application/json');
    else if (act === 'restore') { const f = ($('#rfile').files || [])[0]; if (!f) { DA.toast('Önce yedek dosyasını seçin'); return; } if (!arm(b, 'Mevcut kayıt değişecek. Yeniden basın')) return;
      const r = new FileReader(); r.onload = () => { try { const j = JSON.parse(r.result), d = j.data || j; if (!d || !Array.isArray(d.patients)) throw 0; S = { patients: d.patients.filter(x => x && x.id && (x.mod === 'HD' || x.mod === 'PD')).map(x => { x.visits = x.visits || {}; return x; }) }; save(); DA.toast(S.patients.length + ' hasta yüklendi'); go('veri'); } catch (err) { DA.toast('Dosya okunamadı: geçerli bir yedek değil'); } }; r.readAsText(f); }
    else if (act === 'demo') { demo(); DA.toast('Örnek hastalar eklendi'); go('home'); }
    else if (act === 'wipe') { if (!arm(b)) return; S = { patients: [] }; save(); go('veri'); }
    else if (act === 'yjump') { const el = document.getElementById(b.dataset.id); if (el) { el.open = true; el.scrollIntoView({ block: 'start', behavior: 'smooth' }); if (window.RTEU) RTEU.focus(el); } }
  });
  function onInput(e) {
    const t = e.target;
    if (t.dataset.k) { const p = cur.p, v = p && p.visits[cur.ay]; if (!v) return; const val = t.dataset.k === 'plan' ? t.value : t.value.trim(); if (val === '') delete v[t.dataset.k]; else v[t.dataset.k] = val; if (!p.temp) save(); refresh(); }
    else if (t.dataset.pk) { const p = cur.p; if (!p) return; const val = t.value.trim(); if (val === '') delete p[t.dataset.pk]; else p[t.dataset.pk] = val; refresh(); }
    else if (t.id === 'yq') { $('#ylist').innerHTML = yonList(t.value.trim()); }
  }
  document.addEventListener('input', onInput); document.addEventListener('change', onInput);
  $('#menuBtn').addEventListener('click', () => $('#side').classList.toggle('open'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#side').classList.remove('open'); });
  /* Tema */
  const THEMES = ['system', 'light', 'dark'], TN = { system: 'Sistem', light: 'Açık', dark: 'Koyu' };
  function applyTheme(t) { if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); $('#themeBtn').textContent = 'Tema: ' + TN[t]; }
  let theme = 'system'; try { theme = localStorage.getItem('diyaliz-theme') || 'system'; } catch (e) { }
  applyTheme(theme);
  $('#themeBtn').addEventListener('click', () => { theme = THEMES[(THEMES.indexOf(theme) + 1) % 3]; applyTheme(theme); try { localStorage.setItem('diyaliz-theme', theme); } catch (e) { } });

  /* ---------------- Başlat ---------------- */
  load();
  if (window.DA) DA.config({ app: 'Diyaliz Rehberi', file: 'DiyalizRehberi', color: '#4FB3BE', noFab: true, kind: 'Aylık vizit özeti', org: AUT + ' · ', org2: AUT, directTitle: 'Aylık vizit özeti', patientTitle: 'Hasta', footer: 'Klinik karar desteği amaçlıdır; hasta özelinde hekim değerlendirmesinin yerini tutmaz. Dosya cihazda oluşturulmuştur.' });
  if (window.RTEU) RTEU.init({ key: 'diyaliz', version: VER, date: VDATE, tools: '.sidefoot', view: '#view', rem: true, press: '.mod,.btn,.navbtn,.modcard', cards: '.calc,.modcard', reset: false, enter: false });
  window.addEventListener('hashchange', () => { const h = (location.hash || '').replace('#', ''); if (h && h !== cur.route) go(h); });
  go((location.hash || '').replace('#', '') || 'home');
  if ('serviceWorker' in navigator && location.protocol === 'https:') { navigator.serviceWorker.register('sw.js').catch(() => { }); }
  window.__DRAPP = { state: () => S, go: go, demo: demo, patientItems: patientItems, allSheets: allSheets };
})();
