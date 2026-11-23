const $ = id => document.getElementById(id);
const CODES = { 'delivery robot': 'PQ-C01' };
function normOp(v) {
  const s = String(v || '').replace(/[\s­​-‍⁠﻿]+/g, '');
  const m = s.match(/0x[0-9a-fA-F]{40}/);
  return m ? 'did:peaq:' + m[0] : '';
}
function msg(t, err) { $('msg').textContent = t; $('msg').className = err ? 'err' : ''; }
async function getJSON(url, ms) {
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), ms || 9000);
  try { const r = await fetch(url, { signal: ctl.signal }); clearTimeout(tm); return { ok: r.ok, status: r.status, j: await r.json().catch(() => null) }; }
  catch (e) { clearTimeout(tm); return { ok: false, status: 0, j: null }; }
}
async function record(did) {
  try {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 9000);
    const r = await fetch(`/api/mcr?did=${encodeURIComponent(did)}`, { signal: ctl.signal }); clearTimeout(tm);
    if (!r.ok) return null;
    const d = parseApi(await r.text()).data;
    return (d && (d.mcr !== undefined || d.event_count !== undefined)) ? d : null;
  } catch (e) { return null; }
}
function pickUnit(type) {
  if (CODES[type]) return [].concat(typeof PEAQ_UNITS === 'undefined' ? [] : PEAQ_UNITS, UNITS).find(u => u.code === CODES[type]) || null;
  return null;
}
async function draw() {
  const op = normOp($('op').value);
  if (!op) { msg('Paste an operator wallet: did:peaq:0x followed by 40 hex characters.', true); return; }
  const name = $('fname').value.trim() || 'Fleet';
  const type = $('ftype').value;
  const n = parseInt($('count').value, 10) || 12;
  $('go').disabled = true; $('dl').disabled = true; msg('Reading the fleet from the peaq MCR API…');
  const r = await getJSON(`/api/fleet?operator=${encodeURIComponent(op)}&limit=${n}`, 12000);
  const list = ((r.j && r.j.machines) || []).slice(0, n);
  if (!r.ok || !list.length) { $('go').disabled = false; msg(r.ok ? 'No machines found for this operator.' : 'Could not read this fleet right now. Check the wallet, or try again in a minute.', true); return; }
  const total = (r.j.pagination && r.j.pagination.total) || list.length;
  msg(`Drawing ${list.length} machines from their live records…`);
  const models = await Promise.all(list.map(async (x, i) => {
    const id = String(x.machine_id || x.did || i).slice(-4);
    const rec = await record(x.did).catch(() => null);
    const data = Object.assign({ mcr: x.mcr, mcr_score: x.mcr_score, negative_flag: x.negative_flag, bond_status: 'unknown' }, rec || {});
    if (type) data.machine_type = type;
    const m = buildModel(x.did, data, 'live');
    const u = pickUnit(type); if (u) m.unit = u;
    m.name = `${name} ${id}`;
    return m;
  }));
  render(models, name, total);
  $('go').disabled = false; $('dl').disabled = false;
  msg(`Done: ${models.length} of ${Number(total).toLocaleString('en-US')} machines, drawn from live data.`);
  history.replaceState(null, '', `/fleet?op=${encodeURIComponent(op.slice(9))}&name=${encodeURIComponent(name)}${type ? '&type=' + encodeURIComponent(type) : ''}&n=${n}`);
}
function render(models, name, total) {
  const W = 1600, H = 900, c = $('out'), g = c.getContext('2d');
  c.width = W; c.height = H; c.hidden = false;
  g.fillStyle = '#F0F1F7'; g.fillRect(0, 0, W, H);
  const cols = models.length <= 6 ? 3 : 4, rows = Math.ceil(models.length / cols);
  const top = 150, pad = 40, gap = 18;
  const cell = Math.min((W - pad * 2 - gap * (cols - 1)) / cols, (H - top - 40 - gap * (rows - 1)) / rows);
  const gridW = cols * cell + (cols - 1) * gap, x0 = (W - gridW) / 2;
  g.fillStyle = '#5B5E7E'; g.font = '700 18px Archivo, system-ui, sans-serif';
  g.fillText('MACHINE ELEVATIONS · FLEET SHEET · peaq', pad + (x0 - pad), 62);
  g.fillStyle = '#26287C'; g.font = '800 50px Archivo, system-ui, sans-serif';
  g.fillText(`${name} fleet, live on peaq`, x0, 112);
  g.fillStyle = '#5B5E7E'; g.font = '600 19px Archivo, system-ui, sans-serif';
  const sub = `${models.length} of ${Number(total).toLocaleString('en-US')} machines · read from the peaq MCR API · machine-elevations.vercel.app`;
  g.fillText(sub, x0, 140);
  models.forEach((m, i) => {
    const cx = x0 + (i % cols) * (cell + gap), cy = top + Math.floor(i / cols) * (cell + gap);
    const cv = document.createElement('canvas'); new Sheet(cv, m, Math.round(cell * 2)).draw(4000);
    g.drawImage(cv, cx, cy, cell, cell);
    g.strokeStyle = '#26287C'; g.lineWidth = 2; g.strokeRect(cx, cy, cell, cell);
  });
}
$('go').addEventListener('click', draw);
$('f').addEventListener('submit', e => { e.preventDefault(); draw(); });
$('dl').addEventListener('click', () => {
  const a = document.createElement('a'); a.download = ($('fname').value.trim() || 'fleet').replace(/\W+/g, '-').toLowerCase() + '-fleet-sheet.png';
  a.href = $('out').toDataURL('image/png'); a.click();
});
$('cp').addEventListener('click', async () => {
  const op = normOp($('op').value); if (!op) { msg('Paste an operator wallet first.', true); return; }
  const url = `${location.origin}/fleet?op=${op.slice(9)}&name=${encodeURIComponent($('fname').value.trim() || 'Fleet')}${$('ftype').value ? '&type=' + encodeURIComponent($('ftype').value) : ''}`;
  try { await navigator.clipboard.writeText(url); msg('Link copied.'); } catch (e) { msg(url); }
});
const q = new URLSearchParams(location.search);
if (q.get('op')) {
  $('op').value = q.get('op'); if (q.get('name')) $('fname').value = q.get('name');
  if (q.get('type')) $('ftype').value = q.get('type'); if (q.get('n')) $('count').value = q.get('n') === '6' ? '6' : '12';
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw); else draw();
}
