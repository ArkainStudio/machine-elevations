// ---------- data ----------
const OP = 'did:peaq:0xDEMO0000000000000000000000000000000000';
const SAMPLES = [
  ['demo-01', { mcr: 'AAA', mcr_score: 96, bond_status: 'bonded', event_count: 4812, revenue_trend: 'up' }, 'Top rated'],
  ['demo-02', { mcr: 'AA', mcr_score: 84, bond_status: 'bonded', event_count: 1290, revenue_trend: 'up' }, 'Approved'],
  ['demo-03', { mcr: 'A', mcr_score: 71, bond_status: 'bonded', event_count: 640, revenue_trend: 'stable' }, 'Steady'],
  ['demo-04', { mcr: 'BBB', mcr_score: 58, bond_status: 'bonded', event_count: 233, revenue_trend: 'stable' }, 'Steady'],
  ['demo-05', { mcr: 'BB', mcr_score: 44, bond_status: 'bonded', event_count: 97, revenue_trend: 'down' }, 'Declining'],
  ['demo-06', { mcr: 'B', mcr_score: 31, bond_status: 'bonded', event_count: 10, revenue_trend: 'down' }, 'Low activity'],
  ['demo-07', { mcr: 'Provisioned', mcr_score: 0, bond_status: 'bonded', event_count: 0, revenue_trend: 'insufficient' }, 'Just activated'],
  ['demo-08', { mcr: 'B', mcr_score: 22, bond_status: 'unbonded', event_count: 41, revenue_trend: 'down' }, 'Unbonded'],
  ['demo-09', { mcr: 'BB', mcr_score: 38, bond_status: 'bonded', event_count: 155, revenue_trend: 'stable', negative_flag: true }, 'Flagged'],
].map(([id, d, note]) => Object.assign(buildModel('did:peaq:' + id, { ...d, operator: OP }, 'sample'), { note }));

const WOON = 'did:peaq:61366833690544316781236717989692846058912185534876800261998029075258242676108';
const VEXUD = 'did:peaq:72070072199752035588865179268289351973289970295321663729669764070389137395940';
const CLAW0981 = 'did:peaq:114678985380463396085340569071015783585465315513860965220494351598865276200981';
const CLAW5132 = 'did:peaq:7880844840680473598647715060196938812942482830060030002578453444793444675132';
const SILENCIO = 'did:peaq:0x3307ec84bfcaaeef28f0f0d341ffd293f8412213ea9d1fbb8e08b26feefdddff';
// Names and types as listed in the peaq Machine Explorer (the MCR API does not return them).
const KNOWN = { [SILENCIO]: { type: 'sensor' }, [VEXUD]: { name: 'Booster K1', type: 'humanoid' },
  [CLAW0981]: { name: 'The Claw #0981', type: 'claw machine' }, [CLAW5132]: { name: 'The Claw #5132', type: 'claw machine' } };
const KNOWN_TYPES = Object.fromEntries(Object.entries(KNOWN).filter(([, v]) => v.type).map(([k, v]) => [k, v.type]));
const knownName = did => (KNOWN[did] && KNOWN[did].name) || '';
const REAL = [
  buildModel(WOON, { name: 'Woon', event_count: 0, revenue_trend: null, home_chain: 5, bond_status: 'bonded', negative_flag: false, mcr: 'Provisioned', mcr_score: 0, rating_unavailable: 'no_events_yet' }, 'live'),
  buildModel(VEXUD, { name: 'Booster K1', machine_type: 'humanoid', event_count: 1, revenue_trend: 'insufficient', home_chain: 5, bond_status: 'bonded', negative_flag: false, mcr: 'Provisioned', mcr_score: 0 }, 'live'),
];
REAL.forEach(m => m.note = m.events + (m.events === 1 ? ' event' : ' events'));
const SIL = buildModel(SILENCIO, { name: 'Silencio Sensor', machine_type: 'sensor' }, 'identity'); SIL.note = 'sensor, no MCR record';
REAL.push(SIL);
const CLW = buildModel(CLAW0981, { name: 'The Claw #0981', machine_type: 'claw machine' }, 'identity'); CLW.note = 'claw machine by DualMint';
REAL.push(CLW);

const LADDER = [
  ['NR', 'Drafting Paper', 'Not rated yet', 'Provisioned', 0],
  ['B–BB', 'Field', 'Rated, early record', 'BB', 80],
  ['BBB–A', 'Night Shift', 'Reliable earner', 'A', 600],
  ['AA', 'Blueprint', 'Approved', 'AA', 1500],
  ['AAA', 'Gilded', 'Top of the scale', 'AAA', 5000],
];

// ---------- peaq series ----------
const SERIES = [
  [PEAQ_UNITS[0], 'did:peaq:courier-01', 'PQ Courier · Delivery', { mcr: 'BB', mcr_score: 46, bond_status: 'bonded', event_count: 640, revenue_trend: 'up', operator: 'did:peaq:0xpeaqfleet' }, '<b>PQ Courier.</b> A delivery robot with ring optics, a cargo hull and an indigo status strip. Drawn here at BB, on Field paper.'],
  [PEAQ_UNITS[1], 'did:peaq:operator-01', 'PQ Operator · Humanoid', { mcr: 'Provisioned', mcr_score: 0, bond_status: 'bonded', event_count: 0, operator: 'did:peaq:0xpeaqfleet' }, '<b>PQ Operator.</b> A humanoid with a U-visor and an indigo core. Just activated, so it is still on drafting paper.'],
  [PEAQ_UNITS[2], 'did:peaq:listener-01', 'PQ Listener · Sensor', { mcr: 'AA', mcr_score: 82, bond_status: 'bonded', event_count: 2400, machine_type: 'sensor', operator: 'did:peaq:0xpeaqfleet' }, '<b>PQ Listener.</b> The body for sensors: a microphone capsule, a waveform display, a signal mast and a tripod. Drawn here at AA, on Blueprint paper.'],
  [PEAQ_UNITS[3], 'did:peaq:arcade-01', 'PQ Arcade · Claw machine', { mcr: 'AAA', mcr_score: 95, bond_status: 'bonded', event_count: 5200, machine_type: 'claw machine', operator: 'did:peaq:0xpeaqfleet' }, '<b>PQ Arcade.</b> The body for claw machines like The Claw: a lit marquee, a glass case with a gantry and claw, prizes and a start button. Drawn here at AAA, on Gilded paper.'],
].map(([u, did, name, data, cap]) => Object.assign(peaqModel(did, data, u, name), { cap }));

// ---------- page ----------
const $ = id => document.getElementById(id);
const big = $('big');
let sheet = null, t0 = performance.now(), current = null;
const bigSize = () => Math.max(320, Math.min(980, Math.round(big.parentElement.clientWidth - 20)));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function show(model) {
  current = model; sheet = new Sheet(big, model, bigSize()); t0 = performance.now();
  $('plateName').textContent = model.name;
  const src = $('src');
  src.className = model.source === 'live' ? 'live' : model.source === 'sample' ? 'sample' : 'id';
  src.textContent = model.source === 'live' ? 'Live data from the MCR API' : model.source === 'sample' ? 'Sample data' : 'Drawn from ID only';
  const trend = { up: 'Up', stable: 'Stable', down: 'Down', insufficient: 'Not enough data' }[model.trend] || '—';
  const cells = [
    ['Credit rating', (model.rating || 'NR') + (model.score != null ? `, ${model.score}/100` : '')],
    ['Finish', model.finish], ['Events', model.events], ['Bond', model.bond === '—' ? '—' : model.bond[0].toUpperCase() + model.bond.slice(1)],
    ['Revenue trend', trend], ['Home chain', model.home || '—'], ['Body', model.unit.frame + ' ' + model.unit.cls.toLowerCase()], ['Grid', model.grid],
  ];
  let html = cells.map(([k, v]) => `<div><dt>${k}</dt><dd${k === 'Events' ? ' id="cuEv"' : ''}>${esc(v)}</dd></div>`).join('');
  html += `<div class="span"><dt>peaqID</dt><dd>${esc(model.did)}</dd></div>`;
  if (model.unavailable) html += `<div class="span"><dt>Rating note</dt><dd>${esc(model.unavailable.replace(/_/g, ' '))}</dd></div>`;
  if (model.flagged) html += `<div class="span"><dt>Flag</dt><dd>Negative flag set by peaqOS</dd></div>`;
  $('readout').innerHTML = html;
  const ev = $('cuEv'); if (ev) countUp(ev, model.events);
  document.querySelectorAll('.tile').forEach(c => c.classList.toggle('on', c.dataset.did === model.did));
}
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PLOT_MS = REDUCED ? 0 : 1100;
let hover = null;
function plotOverlay(s, t) {
  if (t >= PLOT_MS) return;
  const ctx = s.ctx, S = s.S, k = t / PLOT_MS, e = 1 - Math.pow(1 - k, 2), y = Math.round(S * e);
  ctx.fillStyle = s.TH.bg; ctx.fillRect(0, y, S, S - y);
  const g = ctx.createLinearGradient(0, y - 28, 0, y);
  g.addColorStop(0, 'rgba(125,227,240,0)'); g.addColorStop(1, 'rgba(125,227,240,0.35)');
  ctx.fillStyle = g; ctx.fillRect(0, y - 28, S, 28);
  ctx.fillStyle = '#7DE3F0'; ctx.fillRect(0, y - 1, S, 2);
  const hx = (S * 0.15) + ((t * 0.9) % (S * 0.7));
  ctx.fillStyle = '#26287C'; ctx.fillRect(hx - 9, y - 5, 18, 10); ctx.fillStyle = '#7DE3F0'; ctx.fillRect(hx - 2, y - 2, 4, 4);
}
function crosshair(s) {
  if (!hover) return;
  const ctx = s.ctx, S = s.S;
  ctx.save(); ctx.strokeStyle = 'rgba(38,40,124,0.55)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(0, hover.y + .5); ctx.lineTo(S, hover.y + .5); ctx.moveTo(hover.x + .5, 0); ctx.lineTo(hover.x + .5, S); ctx.stroke();
  ctx.setLineDash([]); ctx.strokeStyle = '#26287C'; ctx.lineWidth = 1.5; ctx.strokeRect(hover.x - 7, hover.y - 7, 14, 14); ctx.restore();
}
const live = new Set(); let lastThumb = 0;
function loop(now) {
  if (sheet) { const t = now - t0; sheet.draw(t); crosshair(sheet); plotOverlay(sheet, t); }
  if (!REDUCED && now - lastThumb > 80) { lastThumb = now; live.forEach(o => o.sheet.draw(4000 + now * 1 + o.off)); }
  requestAnimationFrame(loop);
}
big.addEventListener('mousemove', ev => {
  if (!sheet) return; const r = big.getBoundingClientRect(), sx = sheet.S / r.width;
  const x = (ev.clientX - r.left) * sx, y = (ev.clientY - r.top) * sx; hover = { x, y };
  const ax = Math.round((x - sheet.ox) / sheet.P), ay = Math.round((y - sheet.oy) / sheet.P);
  const inside = ax >= 0 && ay >= 0 && ax < sheet.SW && ay < sheet.SH;
  $('coords').textContent = inside ? `X ${String(ax).padStart(2, '0')} · Y ${String(ay).padStart(2, '0')} PX · 1:16` : `X — · Y — · ${sheet.m.finish.toUpperCase()}`;
});
big.addEventListener('mouseleave', () => { hover = null; });
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { const o = e.target._live; if (!o) return; e.isIntersecting ? live.add(o) : live.delete(o); }), { rootMargin: '100px' }) : null;
function liveCanvas(cv, m, size) { const s = new Sheet(cv, m, size); s.draw(4000); const o = { sheet: s, off: Math.floor(Math.random() * 0) + (m.hash ? parseInt(m.hash.slice(2, 6), 16) : 0) }; cv._live = o; if (io) io.observe(cv); return s; }
function countUp(el, to, suffix) {
  if (REDUCED || !Number.isFinite(to)) return; const t0c = performance.now();
  const step = now => { const k = Math.min(1, (now - t0c) / 700), v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = v + (suffix || ''); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

function tiles(host, models) {
  models.forEach(m => {
    const b = document.createElement('button'); b.className = 'tile'; b.type = 'button'; b.dataset.did = m.did;
    const cv = document.createElement('canvas'); b.appendChild(cv);
    const cap = document.createElement('div'); cap.className = 'cap';
    const tag = m.source === 'live' ? '<span class="tag">Live</span>' : '';
    cap.innerHTML = `<b>${esc(m.name)}</b>${tag}<br>${esc(m.rating || 'NR')}, ${esc(m.note || '')}`;
    b.appendChild(cap); host.appendChild(b);
    liveCanvas(cv, m, 360);
    b.addEventListener('click', () => { show(m); big.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); });
  });
}
tiles($('real'), REAL); tiles($('fleet'), SAMPLES);
// Live fleet sheet: the first sensors of Silencio's operator, read from the MCR API through /api/fleet.
const SILENCIO_OP = 'did:peaq:0x06EbC22B08229fb796788DB1AAE9675bfC4e22ba';
(async () => {
  if (!/^https?:$/.test(location.protocol)) return;
  try {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 9000);
    const r = await fetch(`/api/fleet?operator=${encodeURIComponent(SILENCIO_OP)}&limit=12`, { signal: ctl.signal }); clearTimeout(tm);
    if (!r.ok) return;
    const j = await r.json(); const list = ((j && j.machines) || []).slice(0, 12);
    if (!list.length) return;
    // Each sensor's own record (bond, events) comes from /api/mcr; the list alone has no bond status.
    const models = await Promise.all(list.map(async x => {
      const id = String(x.machine_id || '').slice(-4);
      const base = { name: `Silencio ${id}`, machine_type: 'sensor', operator: SILENCIO_OP };
      const rec = await fetchRecord(x.did).catch(() => null);
      const data = rec && rec.data ? Object.assign({}, rec.data, base)
        : Object.assign({ mcr: x.mcr, mcr_score: x.mcr_score, negative_flag: x.negative_flag, bond_status: 'unknown' }, base);
      const m = buildModel(x.did, data, 'live');
      m.note = (m.events != null ? m.events + (m.events === 1 ? ' event' : ' events') : 'sensor') + ', live fleet'; return m;
    }));
    const total = j.pagination && j.pagination.total;
    if (total) $('fleetCount').textContent = `· ${Number(total).toLocaleString('en-US')} machines`;
    $('liveFleet').hidden = false;
    tiles($('fleetLive'), models);
  } catch (e) {}
})();
SERIES.forEach(m => {
  const f = document.createElement('figure'); const cv = document.createElement('canvas'); f.appendChild(cv);
  const cap = document.createElement('figcaption'); cap.innerHTML = m.cap; f.appendChild(cap);
  f.style.cursor = 'pointer'; f.addEventListener('click', () => { show(m); big.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  $('series').appendChild(f); liveCanvas(cv, m, 720);
});

LADDER.forEach(([grade, finish, desc, mcr, ev]) => {
  const m = buildModel(WOON, { name: 'Woon', mcr, mcr_score: 0, bond_status: 'bonded', event_count: ev, home_chain: 5 }, 'sample');
  const f = document.createElement('figure'); f.className = 'rung';
  const cv = document.createElement('canvas'); f.appendChild(cv);
  const cap = document.createElement('figcaption'); cap.innerHTML = `<b>${grade}</b>${finish}. ${desc}.`; f.appendChild(cap);
  $('ladder').appendChild(f); liveCanvas(cv, m, 320);
});

const msg = (s, err) => { const el = $('msg'); el.textContent = s; el.className = 'msg' + (err ? ' err' : ''); };
function updateHint() {
  const did = normDid($('mid').value), el = $('apiHint');
  if (!did) { el.innerHTML = 'Open its record in the MCR API. The links appear here once you enter an ID.'; return; }
  const e = did.replace(/[^A-Za-z0-9:._-]/g, encodeURIComponent);
  el.innerHTML = `Open its record: <a href="https://mcr.peaq.xyz/mcr/${e}">machines on peaq</a> or <a href="https://mcr-20.peaq.xyz/mcr/${e}">machines on Solana</a>.`;
}
$('mid').addEventListener('input', updateHint); updateHint();
async function fetchRecord(did) {
  const e = did.replace(/[^A-Za-z0-9:._-]/g, encodeURIComponent);
  const urls = [];
  if (/^https?:$/.test(location.protocol)) urls.push(`/api/mcr?did=${encodeURIComponent(did)}`);
  urls.push(`https://mcr.peaq.xyz/mcr/${e}`, `https://mcr-20.peaq.xyz/mcr/${e}`);
  for (const url of urls) {
    try {
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 9000);
      const r = await fetch(url, { signal: ctl.signal }); clearTimeout(tm);
      if (!r.ok) {
        if (url.startsWith('/api/')) { try { const j = await r.json(); if (j && j.error === 'no_mcr_record') return { missing: true }; } catch (e2) {} }
        continue;
      }
      const txt = await r.text(); const parsed = parseApi(txt);
      if (parsed.data && (parsed.data.mcr !== undefined || parsed.data.event_count !== undefined)) return parsed;
    } catch (err) {}
  }
  return null;
}
$('drawForm').addEventListener('submit', async ev => {
  ev.preventDefault();
  const did = normDid($('mid').value);
  if (!did) { msg('Enter a machine ID to draw it.', true); $('mid').focus(); return; }
  const nm = $('mname').value.trim() || knownName(did);
  const ty = $('mtype').value || KNOWN_TYPES[did] || undefined;
  const base = {}; if (nm) base.name = nm; if (ty) base.machine_type = ty;
  show(buildModel(did, base, 'identity'));
  msg('Reading the machine\'s record from peaq…');
  const rec = await fetchRecord(did);
  if (normDid($('mid').value) !== did) return;
  if (rec && rec.missing) msg('Drawn from the ID only. peaqOS has no credit record for this machine yet, so it stays on drafting paper.');
  else if (rec) { if (nm) rec.data.name = nm; if ($('mtype').value) rec.data.machine_type = $('mtype').value; else if (KNOWN_TYPES[did]) rec.data.machine_type = KNOWN_TYPES[did]; else if (!rec.data.machine_type && ty) rec.data.machine_type = ty; show(buildModel(did, rec.data, 'live')); msg('Live record loaded from the peaq MCR API.'); }
  else msg('Drawn from the ID only. The live record could not be read here, so add it under "Add credit data from peaq".');
});
$('apply').addEventListener('click', () => {
  const raw = $('json').value.trim();
  if (!raw) { msg('Paste the API response first.', true); $('json').focus(); return; }
  try {
    const { did: jd, data } = parseApi(raw);
    const did = jd || normDid($('mid').value);
    if (!did) { msg('The response has no machine ID. Enter the ID above and press Apply again.', true); return; }
    $('mid').value = did; updateHint();
    const nm = $('mname').value.trim() || knownName(did); if (nm) data.name = nm;
    if ($('mtype').value) data.machine_type = $('mtype').value; else if (KNOWN_TYPES[did]) data.machine_type = KNOWN_TYPES[did];
    show(buildModel(did, data, 'live')); msg('Credit data applied.');
    big.scrollIntoView({ block: 'nearest' });
  } catch (e) { msg('The pasted text is not valid JSON. Copy the whole response and try again.', true); }
});

(async () => {
  try {
    const plain = () => { const btn = $('dl'); btn.hidden = false; btn.addEventListener('click', () => {
      if (!current) return; const cv = document.createElement('canvas'); new Sheet(cv, current, 1400).draw(4000);
      const a = document.createElement('a'); a.download = `machine-elevation_${(current.name || current.idPart).replace(/[^a-z0-9-]+/gi, '_').slice(0, 40)}.png`;
      a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove(); }); };
    const inClaude = /claude\.ai|claudeusercontent|claude\.site/.test(location.hostname + document.referrer);
    if (!inClaude) { plain(); return; }
    for (let i = 0; i < 25 && !(window.claude && window.claude.use); i++) await new Promise(r => setTimeout(r, 200));
    if (!window.claude || !window.claude.use) { plain(); return; }
    const downloads = await window.claude.use('downloads'); if (!downloads) return;
    const btn = $('dl'); btn.hidden = false;
    btn.addEventListener('click', async () => {
      if (!current) return;
      const cv = document.createElement('canvas'); new Sheet(cv, current, 1400).draw(4000);
      const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
      const slug = (current.name || current.idPart).replace(/[^a-z0-9-]+/gi, '_').slice(0, 40);
      try { await downloads.save({ filename: `machine-elevation_${slug}.png`, data: blob }); msg('PNG saved.'); }
      catch (e) { msg('The download was cancelled or is not available here.', true); }
    });
  } catch (e) {}
})();

let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (current) { const k = performance.now() - t0; show(current); t0 = performance.now() - k; } }, 150); });
show(REAL[0]);
requestAnimationFrame(loop);
(async () => {
  const st = $('status');
  if (!/^https?:$/.test(location.protocol)) return;
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 9000);
    const r = await fetch('/api/mcr?did=' + encodeURIComponent(WOON), { signal: ctl.signal });
    if (r.ok) { st.className = 'status on'; st.hidden = false; }
  } catch (e) {}
})();
