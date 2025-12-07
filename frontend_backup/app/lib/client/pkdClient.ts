// prefer explicit public base, otherwise build from public ip/port env, else fallback to relative
const BASE = process.env.NEXT_PUBLIC_API_BASE
  ?? (process.env.NEXT_PUBLIC_API_IP && process.env.NEXT_PUBLIC_API_PORT
      ? `http://${process.env.NEXT_PUBLIC_API_IP}:${process.env.NEXT_PUBLIC_API_PORT}`
      : (typeof window !== "undefined" ? "" : `http://${process.env.API_IP ?? "localhost"}:${process.env.API_PORT ?? "8000"}`));

type CacheEntry<T> = { ts: number; data: T };
const CACHE_TTL = 1000 * 60 * 60; // 1h
const CACHE: Record<string, CacheEntry<any>> = {};

// map client paths to local proxy that forwards to backend (uses app/api/proxy/[[...path]]/route.ts)
function apiPath(path: string) {
  if (!path) return path;
  // if user passed full /api/... -> map to /api/proxy/...
  if (path.startsWith("/api/")) return `/api/proxy/${path.slice(5)}`;
  if (path.startsWith("api/")) return `/api/proxy/${path.slice(4)}`;
  return path;
}

async function request<T = any>(path: string, params?: Record<string, any>): Promise<T> {
  const mapped = apiPath(path);
  const url = new URL((BASE || "") + mapped, BASE ? undefined : (typeof window !== "undefined" ? window.location.origin : "http://localhost"));
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url.toString(), {
    credentials: "same-origin",
    headers: { "Accept": "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

export type IndexParams = {
  section?: string;
  division?: string;
  group?: string;
  subclass?: string;
  version?: string;
  forecast_years?: number;
};

export async function health() {
  return request("/api/health");
}

// unified cached fetch helper
async function cachedFetch<T = any>(cacheKey: string, path: string, params?: Record<string, any>, force = false): Promise<T> {
  const entry = CACHE[cacheKey];
  if (!force && entry && (Date.now() - entry.ts) < CACHE_TTL) {
    return entry.data;
  }

  const data = await request<T>(path, params);
  CACHE[cacheKey] = { ts: Date.now(), data };
  try { if (typeof window !== "undefined") localStorage.setItem(cacheKey, JSON.stringify({ ts: CACHE[cacheKey].ts, data })); } catch {}
  return data;
}

export async function getSections(version?: string, options?: { force?: boolean }) {
  const key = `pkd_sections_${version ?? "2025"}`;
  try {
    if (!options?.force && typeof window !== "undefined") {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if ((Date.now() - parsed.ts) < CACHE_TTL) {
          return parsed.data;
        }
      }
    }
  } catch {}
  return cachedFetch(key, "/api/sections", { version }, !!options?.force);
}

export async function getDivisions(section: string, version?: string, options?: { force?: boolean }) {
  const key = `pkd_divisions_${section}_${version ?? "2025"}`;
  try {
    if (!options?.force && typeof window !== "undefined") {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if ((Date.now() - parsed.ts) < CACHE_TTL) return parsed.data;
      }
    }
  } catch {}
  return cachedFetch(key, "/api/divisions", { section, version }, !!options?.force);
}

export async function getGroups(section: string, division: string, version?: string, options?: { force?: boolean }) {
  const key = `pkd_groups_${section}_${division}_${version ?? "2025"}`;
  try {
    if (!options?.force && typeof window !== "undefined") {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if ((Date.now() - parsed.ts) < CACHE_TTL) return parsed.data;
      }
    }
  } catch {}
  return cachedFetch(key, "/api/groups", { section, division, version }, !!options?.force);
}

export async function getIndustry(params: IndexParams) {
  return request("/api/industry", params);
}

export async function getIndex(params: IndexParams) {
  return request("/api/index", params);
}

export async function translateCode(code: string, from_version: string, to_version: string) {
  return request("/api/translate", { code, from_version, to_version });
}