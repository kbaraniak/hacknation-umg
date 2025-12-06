export type IndexParams = {
  section?: string;
  division?: string;
  group?: string;
  subclass?: string;
  version?: string;
  forecast_years?: number;
};

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? ""; // ustaw w .env.local jeśli chcesz bez proxy

async function request<T = any>(path: string, params?: Record<string, any>): Promise<T> {
  const url = new URL((BASE || "") + path, BASE ? undefined : window.location.origin);
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

export async function health() {
  return request("/api/health");
}

export async function getSections(version?: string) {
  return request<{ version: string; sections: string[] }>("/api/sections", { version });
}

export async function getDivisions(section: string, version?: string) {
  return request<{ section: string; version: string; divisions: string[] }>(
    "/api/divisions",
    { section, version }
  );
}

export async function getGroups(section: string, division: string, version?: string) {
  return request<{ section: string; division: string; groups: string[] }>(
    "/api/groups",
    { section, division, version }
  );
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