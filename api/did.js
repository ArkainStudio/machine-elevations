// Reads a legacy (Tokenomics 1.0) peaq DID straight from the peaq chain.
// Read-only: no keys, no wallet. GET /api/did?did=did:peaq:0x...  [&names=a,b] [&debug=1]
//
// 0x + 40 hex (EVM address)  -> eth_call to the DID precompile 0x...0800, read_attribute(address,bytes)
// 0x + 64 hex (32-byte account) -> Substrate RPC peaqdid_readAttribute(SS58 account, name)
const crypto = require('crypto');

const RPCS = [
  'https://peaq.api.onfinality.io/public',
  'https://peaq-rpc.publicnode.com',
  'https://quicknode1.peaq.xyz',
];
const PRECOMPILE = '0x0000000000000000000000000000000000000800';
const SELECTORS = ['0x528bcb4c', '0xb2028b7d']; // read_attribute(address,bytes) / readAttribute(address,bytes)
const DEFAULT_NAMES = ['machineId', 'nftTokenId', 'operator', 'machineType', 'type', 'name',
  'peaqID', 'documentation_url', 'data_api', 'data_visibility', 'machines'];
const DID = /^did:peaq:0x([0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/;
const SS58_PREFIXES = [42, 0];

const hex = b => Buffer.from(b).toString('hex');
const pad32 = h => h.padStart(64, '0');

async function rpc(url, method, params) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
    const j = await r.json().catch(() => null);
    if (!j) return { error: `http ${r.status}` };
    return j.error ? { error: j.error.message || JSON.stringify(j.error) } : { result: j.result };
  } catch (e) { return { error: e.name === 'AbortError' ? 'timeout' : String(e.message || e) }; }
  finally { clearTimeout(t); }
}

// --- SS58 for 32-byte accounts ---
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(buf) {
  let n = BigInt('0x' + (hex(buf) || '0')), s = '';
  while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
  for (const b of buf) { if (b === 0) s = '1' + s; else break; }
  return s;
}
function ss58(pubHex, prefix) {
  const pre = prefix < 64 ? Buffer.from([prefix])
    : Buffer.from([((prefix & 0xfc) >> 2) | 0x40, (prefix >> 8) | ((prefix & 0x03) << 6)]);
  const body = Buffer.concat([pre, Buffer.from(pubHex, 'hex')]);
  const sum = crypto.createHash('blake2b512').update(Buffer.concat([Buffer.from('SS58PRE'), body])).digest();
  return base58(Buffer.concat([body, sum.subarray(0, 2)]));
}

// --- ABI for read_attribute(address,bytes) -> (bytes name, bytes value, uint32 validity, uint256 created) ---
function encodeCall(sel, addr, nameBuf) {
  const len = nameBuf.length, padded = hex(nameBuf).padEnd(Math.ceil(len / 32) * 64, '0');
  return sel + pad32(addr) + pad32((64).toString(16)) + pad32(len.toString(16)) + padded;
}
function decodeAttr(data) {
  const h = (data || '').replace(/^0x/, ''); if (h.length < 64 * 5) return null;
  const word = i => h.slice(i * 64, i * 64 + 64);
  const base = parseInt(word(0), 16) * 2; // offset of the tuple
  const at = o => h.slice(base + o * 2, base + o * 2 + 64);
  const dyn = o => { const off = base + parseInt(at(o), 16) * 2; const n = parseInt(h.slice(off, off + 64), 16) * 2; return Buffer.from(h.slice(off + 64, off + 64 + n), 'hex'); };
  try { return { name: dyn(0), value: dyn(32), validity: parseInt(at(64), 16), created: BigInt('0x' + at(96)).toString() }; }
  catch { return null; }
}
const show = b => { const s = b.toString('utf8'); return /^[\x20-\x7e\s]*$/.test(s) ? s : '0x' + hex(b); };

module.exports = async (req, res) => {
  const did = String((req.query && req.query.did) || '').trim();
  const m = did.match(DID);
  if (!m) return res.status(400).json({ error: 'bad_did', message: 'Expected did:peaq:0x followed by 40 or 64 hex characters.' });
  const acct = m[1].toLowerCase();
  const names = String((req.query && req.query.names) || '').split(',').map(s => s.trim()).filter(Boolean);
  const want = names.length ? names.slice(0, 20) : DEFAULT_NAMES;
  const debug = req.query && req.query.debug === '1';
  const tried = [], attributes = {};
  let used = null;

  async function readOne(url, n) {
    const nameBuf = Buffer.from(n, 'utf8');
    if (acct.length === 40) {
      for (const sel of SELECTORS) {
        const r = await rpc(url, 'eth_call', [{ to: PRECOMPILE, data: encodeCall(sel, acct, nameBuf) }, 'latest']);
        if (r.error) { if (debug) tried.push({ url, name: n, sel, error: r.error }); continue; }
        const a = decodeAttr(r.result);
        return { ok: true, attr: a && (a.value.length || a.name.length) ? { value: show(a.value), validity: a.validity, created: a.created } : null };
      }
    } else {
      for (const p of SS58_PREFIXES) {
        const r = await rpc(url, 'peaqdid_readAttribute', [ss58(acct, p), '0x' + hex(nameBuf)]);
        if (r.error) { if (debug) tried.push({ url, name: n, ss58_prefix: p, error: r.error }); continue; }
        const v = r.result ? Buffer.from(String(r.result.value || '').replace(/^0x/, ''), 'hex') : null;
        return { ok: true, attr: r.result ? { value: show(v), validity: r.result.validity, created: r.result.created } : null };
      }
    }
    return { ok: false };
  }

  for (const url of RPCS) {
    if (debug) {
      const meth = await rpc(url, 'rpc_methods', []);
      tried.push({ url, rpc_methods: meth.error || (meth.result && meth.result.methods || []).filter(x => /did|^eth_call$/.test(x)) });
    }
    const first = await readOne(url, want[0]);
    if (!first.ok) continue;
    used = url;
    const rest = await Promise.all(want.slice(1).map(n => readOne(url, n)));
    [first, ...rest].forEach((r, i) => { if (r.attr) attributes[want[i]] = r.attr; });
    break;
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  const body = { did, account_kind: acct.length === 40 ? 'evm-address' : 'substrate-account', rpc: used, found: Object.keys(attributes).length, attributes };
  if (acct.length === 64) body.ss58 = ss58(acct, 42);
  if (debug) body.tried = tried;
  if (!used) return res.status(502).json({ ...body, error: 'no_rpc', message: 'No peaq RPC endpoint answered.' });
  return res.status(200).json(body);
};
