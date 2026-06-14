import type { Language, Wine } from '../types/wine';

const WINE_KEY = 'junyi.collection.wines';
const LANG_KEY = 'junyi.collection.language';
const THEME_KEY = 'junyi.collection.theme';
const DB_NAME = 'junyi-collection';
const STORE_NAME = 'app-state';

let memoryWines: Wine[] = [];
let memoryLanguage: Language = 'en';
let memoryTheme: 'dark' | 'light' = 'dark';

export function loadWines(): Wine[] {
  const raw = safeGet(WINE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Wine[];
  } catch {
    return memoryWines;
  }
}

export async function loadWinesAsync(): Promise<Wine[]> {
  const wines = await idbGet<Wine[]>(WINE_KEY);
  if (wines) {
    memoryWines = wines;
    return wines;
  }
  return loadWines();
}

export function saveWines(wines: Wine[]) {
  memoryWines = wines;
  safeSet(WINE_KEY, JSON.stringify(wines));
  void idbSet(WINE_KEY, wines);
}

export function getStoredLanguage(): Language {
  const language = safeGet(LANG_KEY) || memoryLanguage;
  return language === 'zh' || language === 'fr' ? language : 'en';
}

export function storeLanguage(language: Language) {
  memoryLanguage = language;
  safeSet(LANG_KEY, language);
  void idbSet(LANG_KEY, language);
}

export function getStoredTheme(): 'dark' | 'light' {
  return (safeGet(THEME_KEY) || memoryTheme) === 'light' ? 'light' : 'dark';
}

export function storeTheme(theme: 'dark' | 'light') {
  memoryTheme = theme;
  safeSet(THEME_KEY, theme);
  void idbSet(THEME_KEY, theme);
}

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private or embedded browsers can expose localStorage with zero quota.
  }
}

function openDb(): Promise<IDBDatabase | null> {
  if (!('indexedDB' in globalThis)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as T | undefined) || null);
    request.onerror = () => resolve(null);
  });
}

async function idbSet<T>(key: string, value: T) {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
  });
}
