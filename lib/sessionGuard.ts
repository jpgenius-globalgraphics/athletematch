// Best-effort, per-isolate dedupe of consumed Stripe checkout sessions.
// State is NOT shared across isolates and is wiped on isolate recycle, so a
// determined attacker hitting fresh isolates can still re-submit. For real
// durability use Cloudflare KV or stamp the Stripe session metadata.

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — well past Stripe's session expiry
const used = new Map<string, number>();

function prune(now: number): void {
  const cutoff = now - TTL_MS;
  for (const [id, ts] of used) {
    if (ts < cutoff) used.delete(id);
  }
}

export function isSessionUsed(sessionId: string): boolean {
  prune(Date.now());
  return used.has(sessionId);
}

export function markSessionUsed(sessionId: string): void {
  const now = Date.now();
  prune(now);
  used.set(sessionId, now);
}
