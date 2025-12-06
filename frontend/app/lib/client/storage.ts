export function saveToStorage(key: string, data: any) {
  if (typeof window === "undefined") return;

  const jsonString = typeof data === "string" ? data : JSON.stringify(data);
  const base64 = btoa(jsonString);
  localStorage.setItem(key, base64);
}

export function loadFromStorage<T = any>(key: string): T | null {
  if (typeof window === "undefined") return null;

  const base64 = localStorage.getItem(key);
  if (!base64) return null;

  try {
    const jsonString = atob(base64);
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}