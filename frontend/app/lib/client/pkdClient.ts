/**
 * PKD API Client
 * Provides cached access to Polish Industry Classification (PKD) data
 */

// ==================== Configuration ====================

const BASE_URL = 
  process.env.NEXT_PUBLIC_API_BASE ??
  (process.env.NEXT_PUBLIC_API_IP && process.env.NEXT_PUBLIC_API_PORT
    ? `http://${process.env.NEXT_PUBLIC_API_IP}:${process.env.NEXT_PUBLIC_API_PORT}`
    : (typeof window !== "undefined" 
        ? "" 
        : `http://${process.env.API_IP ?? "localhost"}:${process.env.API_PORT ?? "8000"}`));

const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// ==================== Types ====================

type CacheEntry<T> = { 
  ts: number; 
  data: T;
};

export type IndexParams = {
  section?: string;
  division?: string;
  group?: string;
  subclass?: string;
  version?: string;
  forecast_years?: number;
  year_from?: number;
  year_to?: number;
};

// ==================== Cache Management ====================

const CACHE: Record<string, CacheEntry<any>> = {};

/**
 * Get cached data from memory or localStorage
 */
function getCachedData<T>(key: string): T | null {
  // Check memory cache first
  const memoryEntry = CACHE[key];
  if (memoryEntry && (Date.now() - memoryEntry.ts) < CACHE_TTL) {
    return memoryEntry.data;
  }

  // Check localStorage (browser only)
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if ((Date.now() - parsed.ts) < CACHE_TTL) {
          // Restore to memory cache
          CACHE[key] = parsed;
          return parsed.data;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  return null;
}

/**
 * Store data in both memory and localStorage cache
 */
function setCachedData<T>(key: string, data: T): void {
  const entry = { ts: Date.now(), data };
  CACHE[key] = entry;

  // Persist to localStorage (browser only)
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // Ignore localStorage errors (quota exceeded, etc.)
    }
  }
}

// ==================== API Utilities ====================

/**
 * Map client paths to proxy routes
 * Routes through /api/proxy/[[...path]] which forwards to backend
 */
function apiPath(path: string): string {
  if (!path) return path;
  
  if (path.startsWith("/api/")) {
    return `/api/proxy/${path.slice(5)}`;
  }
  
  if (path.startsWith("api/")) {
    return `/api/proxy/${path.slice(4)}`;
  }
  
  return path;
}

/**
 * Make an HTTP request to the API
 */
async function request<T = any>(
  path: string, 
  params?: Record<string, any>
): Promise<T> {
  const mappedPath = apiPath(path);
  const baseUrl = BASE_URL || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(baseUrl + mappedPath, BASE_URL ? undefined : origin);

  // Add query parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
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

/**
 * Fetch data with caching support
 */
async function cachedFetch<T = any>(
  cacheKey: string,
  path: string,
  params?: Record<string, any>,
  force = false
): Promise<T> {
  // Return cached data if available and not forcing refresh
  if (!force) {
    const cached = getCachedData<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }
  }

  // Fetch fresh data
  const data = await request<T>(path, params);
  setCachedData(cacheKey, data);
  
  return data;
}

// ==================== Public API Methods ====================

/**
 * Health check endpoint
 */
export async function health() {
  return request("/api/health");
}

/**
 * Get all PKD sections (A-U)
 */
export async function getSections(
  version?: string,
  options?: { force?: boolean }
) {
  const key = `pkd_sections_${version ?? "2025"}`;
  return cachedFetch(key, "/api/sections", { version }, !!options?.force);
}

/**
 * Get all divisions within a section
 */
export async function getDivisions(
  section: string,
  version?: string,
  options?: { force?: boolean }
) {
  const key = `pkd_divisions_${section}_${version ?? "2025"}`;
  return cachedFetch(key, "/api/divisions", { section, version }, !!options?.force);
}

/**
 * Get all groups within a division
 */
export async function getGroups(
  section: string,
  division: string,
  version?: string,
  options?: { force?: boolean }
) {
  const key = `pkd_groups_${section}_${division}_${version ?? "2025"}`;
  return cachedFetch(key, "/api/groups", { section, division, version }, !!options?.force);
}

/**
 * Get industry data for specific PKD code
 */
export async function getIndustry(params: IndexParams) {
  return request("/api/industry", params);
}

/**
 * Get industry index with scores and forecasts
 */
export async function getIndex(params: IndexParams) {
  return request("/api/index", params);
}

/**
 * Translate PKD code between versions (2007 ↔ 2025)
 */
export async function translateCode(
  code: string,
  from_version: string,
  to_version: string
) {
  return request("/api/translate", { code, from_version, to_version });
}

/**
 * Compare multiple branches (codes or sections)
 * Example: codes="46,47,G,C"
 */
export async function compareIndustries(
  codes: string,
  version?: string,
  years?: string
) {
  return request("/api/compare", { codes, version, years });
}

/**
 * Get industry rankings by level
 */
export async function getRankings(
  level?: string,
  version?: string,
  limit?: number,
  min_score?: number,
  order?: string
) {
  return request("/api/rankings", { level, version, limit, min_score, order });
}

/**
 * Get classifications by type
 * Types: risky, growing, high-credit-needs, stable
 */
export async function getClassifications(
  classification_type: string,
  version?: string,
  limit?: number
) {
  return request(`/api/classifications/${classification_type}`, { version, limit });
}

/**
 * Get trends over time for multiple codes
 */
export async function getTrends(
  codes: string,
  years?: string,
  metrics?: string
) {
  return request("/api/trends", { codes, years, metrics });
}

/**
 * Get economy snapshot for a specific year
 */
export async function getEconomySnapshot(
  version?: string,
  year?: number
) {
  return request("/api/economy/snapshot", { version, year });
}
