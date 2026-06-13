import { sampleWines } from '../data/sampleWines';
import type { Language, Wine } from '../types/wine';

const WINE_KEY = 'junyi.collection.wines';
const LANG_KEY = 'junyi.collection.language';
const THEME_KEY = 'junyi.collection.theme';

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

export function saveWines(wines: Wine[]) {
  memoryWines = wines;
  safeSet(WINE_KEY, JSON.stringify(wines));
}

export function loadGiftPreview(): Wine[] {
  saveWines(sampleWines);
  return sampleWines;
}

export function getStoredLanguage(): Language {
  const language = safeGet(LANG_KEY) || memoryLanguage;
  return language === 'zh' || language === 'fr' ? language : 'en';
}

export function storeLanguage(language: Language) {
  memoryLanguage = language;
  safeSet(LANG_KEY, language);
}

export function getStoredTheme(): 'dark' | 'light' {
  return (safeGet(THEME_KEY) || memoryTheme) === 'light' ? 'light' : 'dark';
}

export function storeTheme(theme: 'dark' | 'light') {
  memoryTheme = theme;
  safeSet(THEME_KEY, theme);
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
