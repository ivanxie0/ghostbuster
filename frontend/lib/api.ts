// Typed client for every endpoint in docs/API.md.
import type { DemoSettings, GhostStats, Provider, SearchCreate, SearchCreated, SearchDetail, VerifyResponse } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return body as T;
}

export const api = {
  health: () => req<{ ok: boolean; fake_mode: boolean }>("/api/health"),
  createSearch: (body: SearchCreate) =>
    req<SearchCreated>("/api/search", { method: "POST", body: JSON.stringify(body) }),
  getSearch: (id: string) => req<SearchDetail>(`/api/search/${id}`),
  verify: (id: string, provider_ids: string[]) =>
    req<VerifyResponse>(`/api/search/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({ provider_ids }),
    }),
  /** Human check: patient corrects an extracted date (YYYY-MM-DD); the rules engine re-runs. */
  correctDate: (id: string, providerId: string, date: string) =>
    req<Provider>(`/api/search/${id}/providers/${providerId}/date`, { method: "POST", body: JSON.stringify({ date }) }),
  /** "Report an error" on a provider row (stored; the row then shows "under review"). */
  reportError: (id: string, providerId: string, what: string, contact?: string) =>
    req<{ ok: boolean }>(`/api/search/${id}/providers/${providerId}/report`, {
      method: "POST",
      body: JSON.stringify({ what, contact: contact || null }),
    }),
  /** Ghost Map stats (real registry vs demo providers). */
  ghostStats: () => req<GhostStats>("/api/stats/ghosts"),
  /** Demo control panel (Shift+D). */
  getDemo: () => req<DemoSettings>("/api/demo"),
  setDemo: (force_fallback: boolean) =>
    req<DemoSettings>("/api/demo", { method: "POST", body: JSON.stringify({ force_fallback }) }),
  /** HTML page — open in a new tab / iframe, don't fetch as JSON. */
  packetUrl: (id: string, lang: "en" | "es" = "en") => `${API_URL}/api/search/${id}/packet?lang=${lang}`,
  /** Packet HTML as text (for same-origin iframe srcDoc → printable + downloadable). */
  getPacketHtml: async (id: string, lang: "en" | "es" = "en") => {
    const res = await fetch(`${API_URL}/api/search/${id}/packet?lang=${lang}`, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(body?.error || `HTTP ${res.status}`);
    }
    return res.text();
  },
};

export const POLL_MS = 2000;
