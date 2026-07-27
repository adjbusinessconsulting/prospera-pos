// Run an async task a few times before giving up. Phones that just woke from
// sleep often need a second or two to re-establish the connection and refresh
// the auth token, so the FIRST network call after opening the app frequently
// fails or returns nothing. Retrying quietly in the background means the user
// never has to tap "refresh" by hand to get their data to appear.
export async function withRetry<T>(
  fn: () => Promise<T>,
  ok: (v: T) => boolean,
  { tries = 3, delayMs = 1200 }: { tries?: number; delayMs?: number } = {},
): Promise<T> {
  let last!: T;
  for (let i = 0; i < tries; i++) {
    try {
      last = await fn();
      if (ok(last)) return last;
    } catch { /* swallow — treated as a failed attempt below */ }
    if (i < tries - 1) await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
  }
  return last;
}
