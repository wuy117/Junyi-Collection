import type { Language, TranslationText } from '../types/wine';

type Dictionary = Record<string, Record<Language, string>>;

export const languages: Array<{ code: Language; label: string; short: string }> = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'zh', label: '简体中文', short: '中' },
  { code: 'fr', label: 'Français', short: 'FR' },
];

export const copy: Dictionary = {
  appName: { en: 'The 俊毅 Collection', zh: '俊毅珍藏', fr: 'La Collection Junyi' },
  navCellar: { en: 'Cellar', zh: '酒窖', fr: 'Cave' },
  navJournal: { en: 'Journal', zh: '品酒记录', fr: 'Journal' },
  navMemories: { en: 'Memories', zh: '回忆', fr: 'Souvenirs' },
  navConcierge: { en: 'Concierge', zh: '侍酒顾问', fr: 'Concierge' },
  navLegacy: { en: 'Legacy', zh: '传承', fr: 'Héritage' },
  heroTitle: { en: 'The 俊毅 Collection', zh: '俊毅珍藏', fr: 'La Collection Junyi' },
  heroSubtitle: {
    en: 'A personal cellar, tasting journal, and wine archive',
    zh: '属于俊毅的私人酒窖与品酒档案',
    fr: 'Une cave personnelle, un journal de dégustation et une archive de vins',
  },
  heroGift: {
    en: 'Created by Yimo for Father’s Day 2026',
    zh: '奕谟献给爸爸的 2026 父亲节礼物',
    fr: 'Créé par Yimo pour la Fête des Pères 2026',
  },
  scanTitle: { en: 'AI Wine Identification', zh: 'AI 酒标识别', fr: 'Identification IA du vin' },
  uploadBottle: { en: 'Bottle photo', zh: '酒瓶照片', fr: 'Photo de bouteille' },
  uploadList: { en: 'Wine list', zh: '酒单', fr: 'Carte des vins' },
  identify: { en: 'Identify wine', zh: '识别葡萄酒', fr: 'Identifier le vin' },
  addManual: { en: 'Add manually', zh: '手动添加', fr: 'Ajouter à la main' },
  cellarTitle: { en: 'Personal Cellar', zh: '私人酒窖', fr: 'Cave personnelle' },
  search: { en: 'Search collection', zh: '搜索珍藏', fr: 'Rechercher' },
  allRegions: { en: 'All regions', zh: '全部产区', fr: 'Toutes les régions' },
  sortNewest: { en: 'Newest', zh: '最新加入', fr: 'Plus récents' },
  sortValue: { en: 'Value', zh: '价值', fr: 'Valeur' },
  sortRating: { en: 'Rating', zh: '评分', fr: 'Note' },
  journalTitle: { en: 'Tasting Journal', zh: '品酒日记', fr: 'Journal de dégustation' },
  memoriesTitle: { en: 'Family Memory Mode', zh: '家庭回忆模式', fr: 'Mode souvenirs familiaux' },
  sharedTitle: { en: 'Wines Shared With Family', zh: '与家人共享的酒', fr: 'Vins partagés en famille' },
  conciergeTitle: { en: 'Cellar Concierge AI', zh: 'AI 酒窖侍酒师', fr: 'Concierge IA de la cave' },
  conciergeAsk: { en: 'Ask Jay’s cellar', zh: '询问俊毅的酒窖', fr: 'Interroger la cave de Jay' },
  analyticsTitle: { en: 'Collection Analytics', zh: '珍藏分析', fr: 'Analyse de collection' },
  mapTitle: { en: 'World Wine Map', zh: '世界葡萄酒地图', fr: 'Carte mondiale du vin' },
  legacyTitle: { en: 'Cellar Legacy', zh: '珍藏传承', fr: 'Héritage de la Cave' },
  totalWines: { en: 'Total wines', zh: '总瓶数', fr: 'Total de vins' },
  collectionValue: { en: 'Collection value', zh: '珍藏价值', fr: 'Valeur de la collection' },
  averageRating: { en: 'Average rating', zh: '平均评分', fr: 'Note moyenne' },
  favouriteCountry: { en: 'Favourite country', zh: '最爱国家', fr: 'Pays favori' },
  favouriteGrape: { en: 'Favourite grape', zh: '最爱葡萄', fr: 'Cépage favori' },
  commonRegion: { en: 'Most common region', zh: '最常见产区', fr: 'Région dominante' },
  consumedYear: { en: 'Consumed this year', zh: '今年饮用', fr: 'Bus cette année' },
  emptyTitle: { en: 'Begin the first bottle', zh: '从第一瓶开始', fr: 'Commencer par la première bouteille' },
  emptyBody: {
    en: 'Scan a bottle, upload a wine list, or add a memory to start Jay’s cellar archive.',
    zh: '扫描酒瓶、上传酒单，或添加一段回忆，开启俊毅的私人酒窖档案。',
    fr: 'Scannez une bouteille, importez une carte des vins ou ajoutez un souvenir pour ouvrir l’archive de Jay.',
  },
  sampleData: { en: 'Load gift preview', zh: '载入礼物预览', fr: 'Charger l’aperçu cadeau' },
  readyToDrink: { en: 'Ready to drink', zh: '适饮中', fr: 'Prêt à boire' },
  marketValue: { en: 'Market value', zh: '市场估值', fr: 'Valeur estimée' },
  drinkingWindow: { en: 'Drinking window', zh: '适饮期', fr: 'Fenêtre de dégustation' },
  tastingProfile: { en: 'Tasting profile', zh: '风味画像', fr: 'Profil de dégustation' },
  foodPairings: { en: 'Food pairings', zh: '餐酒搭配', fr: 'Accords mets-vins' },
  facts: { en: 'Interesting facts', zh: '酒款故事', fr: 'Faits intéressants' },
  darkMode: { en: 'Dark mode', zh: '深色模式', fr: 'Mode sombre' },
  lightMode: { en: 'Light mode', zh: '浅色模式', fr: 'Mode clair' },
  offline: { en: 'Offline-ready', zh: '离线可用', fr: 'Disponible hors ligne' },
  supabaseReady: { en: 'Supabase-ready', zh: '可连接 Supabase', fr: 'Prêt pour Supabase' },
};

export function t(key: keyof typeof copy, language: Language) {
  return copy[key][language];
}

export function text(value: TranslationText, language: Language) {
  return value[language] || value.en;
}

export function makeText(en: string, zh: string, fr: string): TranslationText {
  return { en, zh, fr };
}
