// Sends an empty Web Push to each subscribed device. Run by .github/workflows/pocket-quiz.yml.
// No dependencies: the push carries no content, so it only needs a VAPID signature (ES256 JWT).
// The phone's service worker picks the quiz word itself.
//
// Environment:
//   VAPID_PRIVATE_KEY   the private key (base64url "d"), stored as a GitHub secret
//   PUSH_SUBSCRIPTIONS  one or more "setup codes" from the app (JSON objects, a JSON array, or one per line)

import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const VAPID_PUBLIC = 'BEi-D5XWwr3gdprqLXYYTF2RSs-UYEuTZg1BDQ9V6KIV84wRnvt7Fl4pctjdtAFXT0RXir33UKWtP7QsPf5YW-o';
const CONTACT = 'https://github.com/CarterM143/PortugueseApp';

const b64url = (buf) => Buffer.from(buf).toString('base64url');

/** Pull endpoints out of whatever was pasted into the secret. */
export function parseSubscriptions(text) {
  const t = (text || '').trim();
  if (!t) return [];
  const found = [];
  const add = (o) => { if (o && typeof o.endpoint === 'string' && o.endpoint.startsWith('https://')) found.push(o.endpoint); };
  try {
    const j = JSON.parse(t);
    (Array.isArray(j) ? j : [j]).forEach(add);
  } catch {
    // Several JSON objects pasted one after another
    for (const m of t.match(/\{[^{}]*"endpoint"[^{}]*(\{[^{}]*\}[^{}]*)?\}/g) || []) {
      try { add(JSON.parse(m)); } catch { /* skip */ }
    }
    // Or bare endpoint URLs
    for (const m of t.match(/https:\/\/[^\s"',]+/g) || []) if (!found.includes(m)) found.push(m);
  }
  return [...new Set(found)];
}

export function privateKeyObject(d, pub = VAPID_PUBLIC) {
  const raw = Buffer.from(pub, 'base64url');
  return crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d, x: b64url(raw.subarray(1, 33)), y: b64url(raw.subarray(33, 65)) },
    format: 'jwk',
  });
}

/** VAPID JWT for one push service (audience = the endpoint's origin). */
export function vapidJwt(endpoint, d, now = Math.floor(Date.now() / 1000), pub = VAPID_PUBLIC) {
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64url(JSON.stringify({ aud: new URL(endpoint).origin, exp: now + 12 * 3600, sub: CONTACT }));
  const data = `${header}.${payload}`;
  const sig = crypto.sign('sha256', Buffer.from(data), { key: privateKeyObject(d, pub), dsaEncoding: 'ieee-p1363' });
  return `${data}.${b64url(sig)}`;
}

async function main() {
  const d = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const endpoints = parseSubscriptions(process.env.PUSH_SUBSCRIPTIONS);
  if (!d) throw new Error('VAPID_PRIVATE_KEY secret is missing.');
  if (!endpoints.length) throw new Error('PUSH_SUBSCRIPTIONS secret is missing or has no endpoint. Paste the setup code from the app.');
  let ok = 0;
  for (const ep of endpoints) {
    const res = await fetch(ep, {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${vapidJwt(ep, d)}, k=${VAPID_PUBLIC}`,
        TTL: String(4 * 3600), // still deliver if the phone is offline for a few hours
        Urgency: 'normal',
        'Content-Length': '0',
      },
    });
    const host = new URL(ep).host;
    if (res.ok) { ok++; console.log(`Sent to a device via ${host}`); }
    else if (res.status === 404 || res.status === 410) console.log(`A device via ${host} has unsubscribed (${res.status}). Remove its setup code from the secret.`);
    else console.log(`Push via ${host} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  if (!ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => { console.error(err.message); process.exitCode = 1; });
}
