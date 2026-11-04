// Vercel serverless function: reads a machine's record from the peaqOS MCR API
// and returns it to the Machine Elevations page (same origin, so no CORS issue).
// GET /api/mcr?did=did:peaq:<machine id>
const HOSTS = ['https://mcr.peaq.xyz', 'https://mcr-20.peaq.xyz'];

module.exports = async (req, res) => {
  const did = String((req.query && req.query.did) || '').trim();
  if (!/^did:peaq:(0x[0-9a-fA-F]{40}|[0-9]{1,100})$/.test(did)) {
    res.status(400).json({ error: 'Send a machine DID, e.g. ?did=did:peaq:42' });
    return;
  }
  for (const host of HOSTS) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(`${host}/mcr/${did}`, { headers: { accept: 'application/json' }, signal: ctl.signal });
      clearTimeout(timer);
      if (!r.ok) continue;
      const body = await r.text();
      try { JSON.parse(body); } catch (e) { continue; }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      res.setHeader('X-MCR-Source', host);
      res.status(200).send(body);
      return;
    } catch (e) { /* try the next host */ }
  }
  res.status(404).json({ error: 'No record found for this machine on peaq or Solana.' });
};
