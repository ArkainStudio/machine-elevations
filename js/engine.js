// ---------- decode sprite library ----------
const UNITS = UNITS_RAW.map(r => {
  const [code, name, cls, frame, chassis, w, h, pal, rows, anc, labels, coreIdx] = r;
  const dec = s => s.replace(/(\d+)?([a-z])/g, (m, n, c) => c.repeat(n ? +n : 1));
  let eyePix = null;
  if (anc[5]) { eyePix = []; for (let i = 0; i < anc[5].length; i += 2) eyePix.push([anc[5][i], anc[5][i + 1]]); }
  return { code, name, cls, frame, chassis, w, h, pal, rows: rows.map(dec),
    anchors: { eye: anc[0], core: anc[1], arm: anc[2], leg: anc[3], head: anc[4] >= 0 ? anc[4] : undefined, eyePix },
    labels, coreIdx: coreIdx >= 0 ? coreIdx : undefined };
});

// ---------- deterministic hashing ----------
function hash256(str) {
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  for (let k = 0; k < str.length; k++) {
    const c = str.charCodeAt(k);
    for (let i = 0; i < 8; i++) h[i] = Math.imul(h[i] ^ c, 2654435761) ^ (h[(i + 1) & 7] >>> 13);
  }
  for (let r = 0; r < 4; r++) for (let i = 0; i < 8; i++) {
    let x = h[i] ^ (h[(i + 3) & 7] >>> 11);
    x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
    h[i] = x;
  }
  return '0x' + h.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
function sfc32(a, b, c, d) {
  return function () {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11); c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}
function rng(hashHex) {
  const H = hashHex.replace(/^0x/, '').padEnd(64, '0');
  const R = sfc32(...[0, 8, 16, 24].map(i => parseInt(H.slice(i, i + 8), 16)));
  for (let i = 0; i < 12; i++) R();
  return R;
}
const pickW = (R, arr) => { const tot = arr.reduce((s, a) => s + a[1], 0); let r = R() * tot;
  for (const [v, w] of arr) { if ((r -= w) < 0) return v; } return arr[0][0]; };

// ---------- palette ----------
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lum = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
function ramp(stops, t) { t = Math.max(0, Math.min(1, t));
  const s = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(s));
  return mix(hex(stops[i]), hex(stops[i + 1]), s - i); }
const THEMES = {
  'Field':          { bg: '#2C1C24', ink: '#9A7C88', grid: '#3A2830', shadow: '#1E1218', map: c => c },
  'Night Shift':    { bg: '#120E16', ink: '#6F6680', grid: '#1D1824', shadow: '#09070B', map: c => mix(c, [18, 14, 30], 0.26) },
  'Blueprint':      { bg: '#0F2A4A', ink: '#8FB8E8', grid: '#1A3A61', shadow: '#0A1F38', map: c => ramp(['#06182C', '#2B5C94', '#6FA3DE', '#D8ECFF'], lum(c) * 1.1) },
  'Drafting Paper': { bg: '#E9E1CF', ink: '#5B4E48', grid: '#D8CDB6', shadow: '#CDBFA4', map: c => c },
  'Gilded':         { bg: '#17120C', ink: '#B89A5E', grid: '#251D13', shadow: '#0D0A06', map: c => ramp(['#140D06', '#6B4A1C', '#C9973E', '#FFE6A8'], lum(c) * 1.15) },
};
const FINISH = { AAA: 'Gilded', AA: 'Blueprint', A: 'Night Shift', BBB: 'Night Shift', BB: 'Field', B: 'Field' };
const PRE = ['Kor','Cas','Myr','Li','Bel','Syl','Gor','Pax','Tes','Nox','Ash','Lum','Ira','Dun','Hal','Zen','Rav','Vex','Quel','Jov','Bra','Eri','Cyr','Ory','Kae','Fen','Dra','Ume','Tal','Ilo','Sol','Mer'];
const SUF = ['umi','ane','os','oud','ith','ovo','irk','ix','ura','eon','orn','ael','ex','is','ud','ax','ek','iis','oth','ara'];

// ---------- data → model ----------
function normDid(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  return s.startsWith('did:') ? s : 'did:peaq:' + s;
}
// Machine types with a dedicated peaq-series body. Others keep the body picked from the ID.
const TYPE_BODIES = [[/sensor/i, 'PQ-S01'], [/humanoid/i, 'PQ-H01'], [/claw|arcade/i, 'PQ-A01']];
function typeBody(type) {
  if (!type || typeof PEAQ_UNITS === 'undefined') return null;
  for (const [re, code] of TYPE_BODIES) if (re.test(String(type))) return PEAQ_UNITS.find(u => u.code === code) || null;
  return null;
}
function buildModel(did, data, source) {
  data = data || {};
  const hash = hash256('peaq-machine:' + did);
  const R = rng(hash);
  let unit = UNITS[Math.floor(R() * UNITS.length)];
  const typed = typeBody(data.machine_type); if (typed) unit = typed;
  const gen = PRE[Math.floor(R() * PRE.length)] + SUF[Math.floor(R() * SUF.length)] + ' ' + unit.cls;
  const name = data.name ? String(data.name) + ' · ' + unit.cls : gen;
  const blink = 2600 + Math.floor(R() * 3200), bobMs = 620 + Math.floor(R() * 260);
  const opHash = data.operator ? hash256('peaq-operator:' + data.operator) : hash;
  const grid = pickW(rng(opHash), [['4 px', 50], ['8 px', 35], ['Isometric Dots', 15]]);
  const rating = data.mcr || null;
  const finish = FINISH[rating] || 'Drafting Paper';
  const events = Number.isFinite(+data.event_count) ? +data.event_count : 0;
  const act = Math.min(1, Math.log10(1 + events) / 4);
  const bonded = data.bond_status ? (data.bond_status === 'bonded' || data.bond_status === 'unknown') : source !== 'live';
  const alive = bonded && data.active !== false;
  const stamps = [];
  if (!rating || rating === 'NR' || rating === 'Provisioned') stamps.push(['PRELIMINARY — NOT RATED', 'ink']);
  if (!alive) stamps.push(['UNBONDED — OUT OF SERVICE', 'ink']);
  if (data.negative_flag) stamps.push(['FLAGGED — UNDER REVIEW', 'bad']);
  const idPart = did.replace(/^did:peaq:/, '');
  return { did, idPart, hash, unit, name, blink, bobMs, grid, rating, finish, events, act, alive, stamps, source,
    score: data.mcr_score, bond: data.bond_status || (source === 'live' ? 'unknown' : '—'),
    trend: data.revenue_trend || null, operator: data.operator || null, flagged: !!data.negative_flag,
    home: data.home_chain === 5 || data.home_chain === 'solana' ? 'Solana' : data.home_chain !== undefined ? 'peaq' : null,
    unavailable: data.rating_unavailable || null, mtype: data.machine_type || null };
}
function parseApi(txt) {
  const j = JSON.parse(txt);
  const p = j.peaqos || j;
  const g = (...k) => { for (const x of k) if (p[x] !== undefined && p[x] !== null) return p[x]; return undefined; };
  const did = g('did') || (g('machine_id', 'machineId') !== undefined ? 'did:peaq:' + g('machine_id', 'machineId') : null);
  return { did, data: {
    mcr: g('mcr', 'mcr_rating', 'rating'), mcr_score: g('mcr_score', 'mcrScore', 'score'),
    bond_status: g('bond_status', 'bondStatus'), negative_flag: g('negative_flag', 'negativeFlag'),
    event_count: g('event_count', 'eventCount'), revenue_trend: g('revenue_trend', 'revenueTrend'),
    operator: g('operator'), active: g('active'), home_chain: g('home_chain', 'homeChain'),
    machine_type: g('machine_type', 'machineType'), rating_unavailable: g('rating_unavailable', 'ratingUnavailable'),
    name: (j.name && !/^Machine #/.test(j.name)) ? j.name : undefined } };
}

// ---------- renderer (Canvas 2D port of the GRID_ARCHITECT_SERIES renderer) ----------
class Sheet {
  constructor(canvas, m, size) {
    this.c = canvas; this.ctx = canvas.getContext('2d'); this.m = m; this.S = size;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr; canvas.height = size * dpr; this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const u = m.unit; this.u = u;
    this.TH = THEMES[m.finish];
    let pal = u.pal.map(h => this.TH.map(hex(h)));
    if (!m.alive) pal = pal.map(c => { const g = Math.round(lum(c) * 255); return mix(c, [g, g, g], 0.85); });
    this.PAL = pal;
    this.CORE = u.coreIdx !== undefined ? u.coreIdx : u.pal.indexOf('#EDB45A');
    this.HEAD = u.anchors.head !== undefined ? u.anchors.head : u.pal.indexOf('#7C5C6C');
    this.EYE = ['#F4ECBC', '#DA963A'].map(h => u.pal.indexOf(h));
    this.EYEPIX = new Set((u.anchors.eyePix || []).map(([x, y]) => y * 1000 + x));
    this.SPR = u.rows.map(r => [...r].map(ch => ch.charCodeAt(0) - 97));
    this.SW = u.w; this.SH = u.h;
    this.eyeGlow = m.finish === 'Night Shift' ? [120, 255, 214] : m.finish === 'Blueprint' ? [200, 235, 255] : [255, 196, 96];
    this.pulseMs = 700 - 380 * m.act;
    this.scanSpeed = 0.04 + 0.16 * m.act;
    this.sc = document.createElement('canvas'); this.sc.width = this.SW; this.sc.height = this.SH;
    this.sctx = this.sc.getContext('2d'); this.img = this.sctx.createImageData(this.SW, this.SH);
    const S = size;
    this.P = Math.max(1, Math.floor((S * 0.5) / Math.max(this.SW, this.SH)));
    this.ox = Math.floor(S / 2 - (this.SW * this.P) / 2);
    this.oy = Math.floor(S * 0.43 - (this.SH * this.P) / 2);
  }
  col(c, a = 1) { const [r, g, b] = typeof c === 'string' ? hex(c) : c; return `rgba(${r},${g},${b},${a})`; }
  line(x1, y1, x2, y2) { const x = this.ctx; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); }
  txt(s, x, y, size, al = 'left', a = 1, color) {
    const c = this.ctx; c.fillStyle = this.col(color || this.TH.ink, a);
    c.font = `${size}px ui-monospace, Menlo, Consolas, monospace`; c.textAlign = al; c.textBaseline = 'alphabetic'; c.fillText(s, x, y);
  }
  draw(t) {
    const { ctx, S, m } = this;
    ctx.fillStyle = this.TH.bg; ctx.fillRect(0, 0, S, S);
    this.drawGrid(); this.drawSheet();
    const bob = m.alive ? Math.floor(t / m.bobMs) % 2 : 0;
    this.drawShadow(bob); this.drawSprite(t, bob);
    if (m.alive) this.drawGlow(t, bob);
    if (m.alive && m.events > 0) this.drawScan(t);
    this.drawAnnotations(t, bob); this.drawStamps();
  }
  drawGrid() {
    const { ctx, S, P, ox, oy } = this, g = hex(this.TH.grid), mg = Math.round(S * 0.035) + 6;
    ctx.save(); ctx.beginPath(); ctx.rect(mg, mg, S - 2 * mg, S - 2 * mg); ctx.clip();
    if (this.m.grid === 'Isometric Dots') {
      ctx.fillStyle = this.col(g); const st = P * 6;
      for (let y = (oy % st); y < S; y += st)
        for (let x = (ox % st) + ((Math.round((y - oy) / st) & 1) ? st / 2 : 0); x < S; x += st)
          ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, P / 3), Math.max(1, P / 3));
    } else {
      const st = P * (this.m.grid === '4 px' ? 4 : 8); ctx.lineWidth = 1;
      for (let k = -40; k < 80; k++) {
        const x = ox + k * st, y = oy + k * st;
        ctx.strokeStyle = this.col(g, k % 4 === 0 ? 1 : 0.47);
        if (x > 0 && x < S) this.line(x + 0.5, 0, x + 0.5, S);
        if (y > 0 && y < S) this.line(0, y + 0.5, S, y + 0.5);
      }
    }
    ctx.restore();
  }
  drawSheet() {
    const { ctx, S, m } = this, mg = Math.round(S * 0.035), ink = this.TH.ink;
    ctx.lineWidth = Math.max(1, S / 900); ctx.strokeStyle = this.col(ink);
    ctx.strokeRect(mg, mg, S - 2 * mg, S - 2 * mg);
    ctx.strokeStyle = this.col(ink, 0.43); ctx.strokeRect(mg + 6, mg + 6, S - 2 * mg - 12, S - 2 * mg - 12);
    const zs = (S - 2 * mg) / 8, fs = S / 95;
    ctx.strokeStyle = this.col(ink);
    for (let i = 0; i < 8; i++) {
      const c = mg + zs * (i + 0.5);
      this.txt('ABCDEFGH'[i], c, mg - fs * 0.4, fs, 'center', 0.63);
      this.txt(String(i + 1), mg - fs * 0.9, c + fs * 0.35, fs, 'center', 0.63);
      if (i) { this.line(mg + zs * i, mg, mg + zs * i, mg + 6); this.line(mg, mg + zs * i, mg + 6, mg + zs * i); }
    }
    const fs2 = S / 70;
    this.txt('ELEVATION — FRONT', mg + 20, mg + 20 + fs2, fs2 * 1.05);
    this.txt(`DWG PQ-${m.idPart.slice(0, 14).toUpperCase()}`, mg + 20, mg + 20 + fs2 * 2.4, fs2 * 0.8, 'left', 0.67);
    const srcLabel = m.source === 'live' ? 'DATA: LIVE · MCR API' : m.source === 'sample' ? 'DATA: SAMPLE' : 'DATA: IDENTITY ONLY';
    this.txt(srcLabel, S - mg - 20, mg + 20 + fs2, fs2 * 0.8, 'right', 0.8);
    const short = s => s.length > 26 ? s.slice(0, 16) + '…' + s.slice(-8) : s;
    const tr = { up: '▲ UP', stable: '■ STABLE', down: '▼ DOWN', insufficient: '— N/A' }[m.trend] || '—';
    const rows = [
      ['PEAQ · MACHINE ELEVATIONS', 1.0],
      [m.name.toUpperCase(), 1.25],
      [`MCR ${m.rating || 'NR'}${m.score !== undefined && m.score !== null ? ' ' + m.score + '/100' : ''}   FINISH ${m.finish.toUpperCase()}`, 0.85],
      [`EVENTS ${m.events}   BOND ${String(m.bond).toUpperCase()}   TREND ${tr}`, 0.85],
      [`ID ${short(m.did)}${m.home ? '   HOME ' + m.home.toUpperCase() : ''}`, 0.85],
      [m.operator ? `OPR ${short(m.operator)}` : `SEED ${m.hash.slice(0, 12)}...${m.hash.slice(-6)}`, 0.85],
      ['SCALE 1:16   DRAWN ARKAIN STUDIO', 0.85],
    ];
    const bw = S * 0.42, lh = fs2 * 1.9, bh = lh * rows.length, bx = S - mg - 6 - bw, by = S - mg - 6 - bh;
    ctx.fillStyle = this.col(this.TH.bg, 0.85); ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = this.col(ink); ctx.strokeRect(bx, by, bw, bh);
    rows.forEach(([s, k], i) => {
      if (i) { ctx.strokeStyle = this.col(ink, 0.35); this.line(bx, by + lh * i, bx + bw, by + lh * i); }
      this.txt(s, bx + fs2 * 0.8, by + lh * i + lh * 0.66, fs2 * k, 'left', i === 1 ? 1 : 0.8);
    });
  }
  drawShadow(bob) {
    const { ctx, P, ox, oy, SW, SH } = this; ctx.fillStyle = this.TH.shadow;
    const cx = ox + (SW * P) / 2, cy = oy + SH * P + P * 2, rw = SW * 0.36 - bob, rh = 2.2;
    for (let y = -rh; y <= rh; y++) {
      const w = Math.round(rw * Math.sqrt(Math.max(0, 1 - (y / (rh + 0.6)) ** 2)));
      ctx.fillRect(Math.round(cx - w * P), Math.round(cy + y * P), w * 2 * P, P);
    }
  }
  drawSprite(t, bob) {
    const { m, SW, SH, SPR, PAL, img } = this;
    const blink = !m.alive || (t % m.blink) < 140;
    const pulse = m.alive ? 0.5 + 0.5 * Math.sin(t / this.pulseMs * (420 / 420)) : 0;
    const d = img.data; d.fill(0);
    const hot = m.finish === 'Blueprint' ? [235, 235, 235] : [255, 236, 170];
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      const v = SPR[y][x]; if (!v) continue;
      let c = PAL[v];
      if (blink && (this.u.anchors.eyePix ? this.EYEPIX.has(y * 1000 + x) : (y < SH * 0.2 && this.EYE.includes(v)))) c = PAL[this.HEAD];
      else if (v === this.CORE) c = mix(c, hot, pulse * (0.2 + 0.25 * m.act));
      const i = (y * SW + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    this.sctx.putImageData(img, 0, 0);
    const ctx = this.ctx; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.sc, this.ox, this.oy - bob * this.P, SW * this.P, SH * this.P);
  }
  drawGlow(t, bob) {
    const { ctx, m, P, ox, oy } = this, blink = (t % m.blink) < 140;
    const pulse = 0.55 + 0.45 * Math.sin(t / this.pulseMs);
    const glow = (gx, gy, r, a) => {
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      g.addColorStop(0, `rgba(${this.eyeGlow},${a})`); g.addColorStop(1, `rgba(${this.eyeGlow},0)`);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(gx - r, gy - r, r * 2, r * 2); ctx.restore();
    };
    const a = this.u.anchors;
    if (!blink && (!a.eyePix || this.EYEPIX.size)) glow(ox + a.eye[0] * P, oy + (a.eye[1] - bob) * P, P * 9, 0.22 * pulse);
    glow(ox + a.core[0] * P, oy + (a.core[1] - bob) * P, P * (10 + 10 * m.act), (0.05 + 0.12 * m.act) * pulse);
  }
  drawScan(t) {
    const { ctx, P, ox, oy, SW, SH } = this;
    const span = SH * P + P * 8, y = oy - P * 4 + ((t * this.scanSpeed) % span);
    ctx.fillStyle = `rgba(${this.eyeGlow},0.16)`; ctx.fillRect(ox - P * 6, Math.round(y), SW * P + P * 12, P);
    ctx.fillStyle = `rgba(${this.eyeGlow},0.055)`; ctx.fillRect(ox - P * 6, Math.round(y) - P * 3, SW * P + P * 12, P * 3);
  }
  drawAnnotations(t, bob) {
    const { ctx, S, P, ox, oy, SW, SH, u } = this;
    const k = Math.min(1, t / 1400), e = 1 - (1 - k) ** 3;
    const fs = S / 78; ctx.lineWidth = Math.max(1, S / 1000); ctx.strokeStyle = this.col(this.TH.ink);
    const y0 = oy + SH * P + P * 11, x0 = ox, x1 = ox + SW * P, xm = (x0 + x1) / 2, hw = (x1 - x0) / 2 * e;
    this.line(xm - hw, y0, xm + hw, y0);
    [x0, x1].forEach(x => { this.line(x, y0 - P * 2, x, y0 + P * 2); this.line(x - P, y0 + P, x + P, y0 - P); });
    ctx.strokeStyle = this.col(this.TH.ink, 0.31);
    this.line(x0, oy + SH * P + P, x0, y0 - P * 2); this.line(x1, oy + SH * P + P, x1, y0 - P * 2);
    ctx.strokeStyle = this.col(this.TH.ink);
    this.txt(`${SW} PX`, xm, y0 - P * 1.2, fs, 'center', e);
    const xL = ox - P * 9, ya = oy, yb = oy + SH * P, ym = (ya + yb) / 2, hh = (yb - ya) / 2 * e;
    this.line(xL, ym - hh, xL, ym + hh);
    [ya, yb].forEach(y => { this.line(xL - P * 2, y, xL + P * 2, y); this.line(xL - P, y + P, xL + P, y - P); });
    ctx.save(); ctx.translate(xL - P * 1.5, ym); ctx.rotate(-Math.PI / 2); this.txt(`${SH} PX`, 0, 0, fs, 'center', e); ctx.restore();
    const A = u.anchors, L = u.labels || ['OPTIC SENSOR', 'AMBER CORE', 'MANIPULATOR', 'BIPED DRIVE'];
    const items = [[A.eye, 'right', '01', L[0]], [A.core, 'right', '02', L[1]], [A.arm, 'left', '03', L[2]], [A.leg, 'left', '04', L[3]]];
    const lastY = { left: -1e9, right: -1e9 }, gap = fs * 3.6;
    const EY = items.map(([pt, side]) => { const y = Math.max(oy + (pt[1] - bob) * P - P * 6, lastY[side] + gap); lastY[side] = y; return y; });
    items.forEach(([pt, side, n, label], i) => {
      const ki = Math.max(0, Math.min(1, (t - 300 - i * 180) / 600)); if (!ki) return;
      const px = ox + pt[0] * P, py = oy + (pt[1] - bob) * P;
      const ex = side === 'right' ? ox + SW * P + P * 12 : ox - P * 20, ey = EY[i];
      const mm = Math.round(S * 0.035) + 16;
      const lx = side === 'right' ? Math.min(S - mm, ex + S * 0.09) : Math.max(mm, ex - S * 0.09);
      ctx.strokeStyle = this.col(this.TH.ink);
      this.line(px, py, px + (ex - px) * ki, py + (ey - py) * ki);
      if (ki === 1) this.line(ex, ey, lx, ey);
      ctx.fillStyle = this.TH.bg; ctx.beginPath(); ctx.arc(px, py, P * 0.9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (ki === 1) {
        const tx = side === 'right' ? ex + P : lx;
        this.txt(n, tx, ey - P * 1.2, fs * 0.8, 'left', 0.67);
        this.txt(label, tx, ey + fs * 1.25, fs, 'left', 1);
      }
    });
  }
  drawStamps() {
    const { ctx, S, m } = this; if (!m.stamps.length) return;
    const fs = S / 48, mg = Math.round(S * 0.035);
    m.stamps.forEach(([s, tone], i) => {
      const color = tone === 'bad' ? '#E8504A' : this.TH.ink;
      ctx.save(); ctx.translate(mg + 26 + S * 0.16, S - mg - S * 0.13 - i * fs * 2.6); ctx.rotate(-0.06);
      ctx.font = `600 ${fs}px ui-monospace, Menlo, Consolas, monospace`;
      const w = ctx.measureText(s).width + fs * 1.2, h = fs * 1.9;
      ctx.lineWidth = Math.max(1.5, S / 400); ctx.strokeStyle = this.col(color, 0.85);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = this.col(color, 0.85); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 1);
      ctx.restore();
    });
  }
}

