/**
 * Canonical hostname normalization for Cookie Guardian.
 * Used across popup, content script, and service worker.
 * Loaded as a classic script (MV3); functions are global in each context.
 */

const HOSTNAME_MAX_LENGTH = 253;
const FQDN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*$/;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6_RE = /^\[?[a-f0-9:]+\]?$/;

function normalizeHostname(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return null;
  if (/[<>"'`&]/.test(raw)) return null;
  let host;
  try {
    host = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname;
  } catch {
    return null;
  }
  host = host.replace(/\.$/, '');
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
  if (host.startsWith('www.')) host = host.slice(4);
  if (!host || host.length > HOSTNAME_MAX_LENGTH) return null;
  if (!FQDN_RE.test(host) && !IPV4_RE.test(host) && !IPV6_RE.test(host) && host !== 'localhost') {
    return null;
  }
  return host;
}

function hostsMatch(a, b) {
  const na = normalizeHostname(a);
  const nb = normalizeHostname(b);
  if (!na || !nb) return false;
  return na === nb;
}

function isSubdomainOf(sub, parent) {
  const ns = normalizeHostname(sub);
  const np = normalizeHostname(parent);
  if (!ns || !np) return false;
  return ns === np || ns.endsWith('.' + np);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeHostname, hostsMatch, isSubdomainOf };
}
