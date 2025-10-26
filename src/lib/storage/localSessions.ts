const STORAGE_KEY = "realwebwins.recentMVPs";
const MAX_ITEMS = 3;

export interface StoredMVP {
  id: string;
  title: string | null;
  validationScore: number | null;
  timestamp: string;
}

function readStorage(): StoredMVP[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredMVP[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean);
  } catch {
    return [];
  }
}

function writeStorage(entries: StoredMVP[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ITEMS)));
}

export function addRecentMVP(entry: StoredMVP) {
  if (typeof window === "undefined") return;
  const existing = readStorage().filter((item) => item.id !== entry.id);
  writeStorage([entry, ...existing]);
}

export function getRecentMVPs(): StoredMVP[] {
  return readStorage();
}

export function clearRecentMVPs() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
