// Typed client for every endpoint in docs/API.md.
import type { DemoSettings, SearchCreate, SearchCreated, SearchDetail, VerifyResponse } from "./types";

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
  /** Demo control panel (Shift+D). */
  getDemo: () => req<DemoSettings>("/api/demo"),
  setDemo: (force_fallback: boolean) =>
    req<DemoSettings>("/api/demo", { method: "POST", body: JSON.stringify({ force_fallback }) }),
  /** HTML page — open in a new tab / iframe, don't fetch as JSON. */
  packetUrl: (id: string) => `${API_URL}/api/search/${id}/packet`,
  /** Packet HTML as text (for same-origin iframe srcDoc → printable + downloadable). */
  getPacketHtml: async (id: string) => {
    const res = await fetch(`${API_URL}/api/search/${id}/packet`, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(body?.error || `HTTP ${res.status}`);
    }
    return res.text();
  },
};

export const POLL_MS = 2000;
