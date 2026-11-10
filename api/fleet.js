// Lists an operator's machines from the peaqOS MCR API, for fleet sheets.
// GET /api/fleet?operator=did:peaq:0x<40 hex>&offset=0&limit=12
const HOST = 'https://mcr.peaq.xyz';
const OP = /^did:peaq:0x[0-9a-fA-F]{40}$/;

module.exports = async (req, res) => {
  const q = req.query || {};
  const op = String(q.operator || '').trim();
  if (!OP.test(op)) return res.status(400).json({ error: 'bad_operator', message: 'Send ?operator=did:peaq:0x followed by 40 hex characters.' });
  const offset = Math.max(0, Math.min(1e9, parseInt(q.offset, 10) || 0));
  const limit = Math.max(1, Math.min(50, parseInt(q.limit, 10) || 12));
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(`${HOST}/operator/${op}/machines?offset=${offset}&limit=${limit}`, { headers: { accept: 'application/json' }, signal: ctl.signal });
    clearTimeout(t);
    const body = await r.text();
    let j; try { j = JSON.parse(body); } catch (e) { return res.status(502).json({ error: 'bad_upstream', status: r.status, detail: body.slice(0, 200) }); }
    if (!r.ok) return res.status(r.status).json({ error: 'upstream', status: r.status, detail: j });
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json(j);
  } catch (e) {
    return res.status(502).json({ error: 'unreachable', message: String(e && e.message || e) });
  }
};
