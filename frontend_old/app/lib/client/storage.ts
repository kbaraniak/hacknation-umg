export function saveToStorage(key: string, data: any) {
  if (typeof window === "undefined") return;

  const jsonString = JSON.stringify(data);

  try {
    const base64 = btoa(jsonString);
    localStorage.setItem(key, base64);
  } catch {
    localStorage.setItem(key, jsonString);
  }
}

export function loadFromStorage<T = any>(key: string): T | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const jsonString = atob(raw);
    try {
      return JSON.parse(jsonString) as T;
    } catch {
      return jsonString as unknown as T;
    }
  } catch {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }
}