/**
 * Shared authed fetch with auto-refresh on 401.
 *
 * Client-side. All BFF requests from client code (other than /login,
 * /refresh, /logout) should go through `authedFetch` so a single 401 triggers
 * a single refresh attempt + retry.
 *
 * Concurrent 401s are deduplicated: only one `/api/v1/refresh` call runs at a
 * time. All concurrent callers await the same refresh promise.
 */
"use client";

let _refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  // Deduplicate — if a refresh is already in-flight, await it.
  if (_refreshing) return _refreshing;

  _refreshing = (async () => {
    try {
      const res = await fetch("/api/v1/refresh", {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Clear the slot so the next 401 (after this refresh resolves) can try
      // again. This runs before the awaited promise resolves to consumers.
      _refreshing = null;
    }
  })();

  return _refreshing;
}

/**
 * Fetch wrapper that:
 *   1. Sends credentials (cookies) on every request.
 *   2. On 401, triggers a refresh (deduplicated across concurrent callers).
 *   3. If refresh succeeds, retries the original request exactly once.
 *   4. Returns the (possibly-401) response if refresh fails.
 */
export async function authedFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const mergedInit: RequestInit = { ...init, credentials: "include" };

  let res = await fetch(url, mergedInit);
  if (res.status !== 401) return res;

  const refreshed = await doRefresh();
  if (!refreshed) return res; // give the caller the 401 to handle

  // Retry once with a fresh access-token cookie.
  return fetch(url, mergedInit);
}
