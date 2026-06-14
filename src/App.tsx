import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Bot,
  Camera,
  ChevronRight,
  Crown,
  Edit3,
  Globe2,
  Heart,
  Languages,
  MapPinned,
  Moon,
  Plus,
  Save,
  Search,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Upload,
  Users,
  Wine as WineIcon,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { askCellarConcierge, identifyWineImage, type AiWineIdentification, type WineSummary } from './lib/ai';
import { languages, makeText, t, text } from './lib/i18n';
import { getStoredLanguage, getStoredTheme, storeLanguage, storeTheme } from './lib/storage';
import { supabase, uploadWineImage } from './lib/supabase';
import { useCollection } from './hooks/useCollection';
import type { Language, Memory, Rarity, TastingEntry, TranslationText, Wine, WineStyle } from './types/wine';

type Section = 'cellar' | 'journal' | 'memories' | 'concierge' | 'legacy';
type WineDraft = {
  id?: string;
  photo?: string;
  name: string;
  producer: string;
  vintage: string;
  country: string;
  region: string;
  grape: string;
  style: WineStyle;
  estimatedValue: string;
  estimatedPriceRange: string;
  confidenceScore: string;
  visibleLabelText: string;
  warningsOrUncertainty: string;
  drinkingWindow: string;
  tastingProfile: string;
  foodPairings: string;
  facts: string;
  notes: string;
  location: string;
  rarity: Rarity;
  consumed: boolean;
  sharedWith: string;
};

const navItems: Array<{ id: Section; label: keyof typeof import('./lib/i18n').copy; icon: typeof WineIcon }> = [
  { id: 'cellar', label: 'navCellar', icon: WineIcon },
  { id: 'journal', label: 'navJournal', icon: BookOpen },
  { id: 'memories', label: 'navMemories', icon: Heart },
  { id: 'concierge', label: 'navConcierge', icon: Bot },
  { id: 'legacy', label: 'navLegacy', icon: Crown },
];

const rarityLabels: Record<Rarity, Record<Language, string>> = {
  common: { en: 'Common', zh: '常见', fr: 'Commun' },
  uncommon: { en: 'Uncommon', zh: '少见', fr: 'Peu commun' },
  rare: { en: 'Rare', zh: '稀有', fr: 'Rare' },
  veryRare: { en: 'Very Rare', zh: '极稀有', fr: 'Très rare' },
  collectible: { en: 'Collectible', zh: '收藏级', fr: 'De collection' },
};

const styleLabels: Record<WineStyle, Record<Language, string>> = {
  red: { en: 'Red', zh: '红葡萄酒', fr: 'Rouge' },
  white: { en: 'White', zh: '白葡萄酒', fr: 'Blanc' },
  sparkling: { en: 'Sparkling', zh: '起泡酒', fr: 'Effervescent' },
  rose: { en: 'Rosé', zh: '桃红葡萄酒', fr: 'Rosé' },
  sweet: { en: 'Sweet', zh: '甜酒', fr: 'Doux' },
  fortified: { en: 'Fortified', zh: '加强酒', fr: 'Fortifié' },
};

const tagLabels: Record<string, Record<Language, string>> = {
  Celebration: { en: 'Celebration', zh: '庆祝', fr: 'Célébration' },
  'Family Dinner': { en: 'Family Dinner', zh: '家庭晚餐', fr: 'Dîner familial' },
  'Business Dinner': { en: 'Business Dinner', zh: '商务晚宴', fr: 'Dîner d’affaires' },
  Holiday: { en: 'Holiday', zh: '节日', fr: 'Fête' },
  Anniversary: { en: 'Anniversary', zh: '纪念日', fr: 'Anniversaire' },
  'Special Bottle': { en: 'Special Bottle', zh: '特别酒款', fr: 'Bouteille spéciale' },
};

const occasionTags = Object.keys(tagLabels);
const regions = ['Bordeaux', 'Burgundy', 'Champagne', 'Rhône Valley', 'Tuscany', 'Piedmont', 'Rioja', 'Napa Valley', 'Barossa Valley', 'Mendoza'];
const heroImageUrl = `${import.meta.env.BASE_URL}cellar-hero.png`;
const regionPositions: Record<string, { x: string; y: string }> = {
  Bordeaux: { x: '47%', y: '42%' },
  Burgundy: { x: '50%', y: '38%' },
  Champagne: { x: '49%', y: '34%' },
  'Rhône Valley': { x: '51%', y: '45%' },
  Tuscany: { x: '56%', y: '48%' },
  Piedmont: { x: '54%', y: '43%' },
  Rioja: { x: '43%', y: '47%' },
  'Napa Valley': { x: '18%', y: '44%' },
  'Barossa Valley': { x: '82%', y: '73%' },
  Mendoza: { x: '28%', y: '72%' },
};

const emptyDraft: WineDraft = {
  name: '',
  producer: '',
  vintage: new Date().getFullYear().toString(),
  country: '',
  region: '',
  grape: '',
  style: 'red',
  estimatedValue: '',
  estimatedPriceRange: '',
  confidenceScore: '',
  visibleLabelText: '',
  warningsOrUncertainty: '',
  drinkingWindow: '',
  tastingProfile: '',
  foodPairings: '',
  facts: '',
  notes: '',
  location: '',
  rarity: 'common',
  consumed: false,
  sharedWith: 'Jay',
};

export function App() {
  const { wines, analytics, addWine, updateWine, deleteWine, loadPreview } = useCollection();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getStoredTheme());
  const [section, setSection] = useState<Section>('cellar');
  const [query, setQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [sort, setSort] = useState<'newest' | 'value' | 'rating'>('newest');
  const [selectedRegion, setSelectedRegion] = useState('Bordeaux');
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<WineDraft>(emptyDraft);
  const [isAiDraft, setIsAiDraft] = useState(false);
  const [identifyStatus, setIdentifyStatus] = useState('');
  const [identifyError, setIdentifyError] = useState('');
  const [conciergeQuestion, setConciergeQuestion] = useState('');
  const [conciergeAnswer, setConciergeAnswer] = useState('');
  const [conciergeError, setConciergeError] = useState('');
  const [conciergeLoading, setConciergeLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    document.documentElement.lang = language;
    storeLanguage(language);
  }, [language]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    storeTheme(theme);
  }, [theme]);

  const filteredWines = useMemo(() => {
    return wines
      .filter((wine) => {
        const haystack = [text(wine.name, language), wine.producer, text(wine.region, language), text(wine.country, language), text(wine.grape, language)].join(' ').toLowerCase();
        return haystack.includes(query.toLowerCase()) && (regionFilter === 'all' || wine.region.en === regionFilter);
      })
      .sort((a, b) => {
        if (sort === 'value') return b.estimatedValue - a.estimatedValue;
        if (sort === 'rating') return averageWineRating(b) - averageWineRating(a);
        return b.dateAdded.localeCompare(a.dateAdded);
      });
  }, [language, query, regionFilter, sort, wines]);

  const valueByRegion = useMemo(() => {
    const grouped = wines.reduce<Record<string, number>>((acc, wine) => {
      acc[wine.region.en] = (acc[wine.region.en] || 0) + wine.estimatedValue;
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [wines]);

  const rarityData = useMemo(() => {
    const grouped = wines.reduce<Record<Rarity, number>>((acc, wine) => {
      acc[wine.rarity] = (acc[wine.rarity] || 0) + 1;
      return acc;
    }, {} as Record<Rarity, number>);
    return Object.entries(grouped).map(([name, value]) => ({ name: rarityLabels[name as Rarity][language], value }));
  }, [language, wines]);

  const sharedWithYimo = wines.filter((wine) => wine.sharedWith.includes('Yimo'));
  const familyShared = wines.filter((wine) => wine.sharedWith.length > 2);
  const favouriteShared = [...wines].sort((a, b) => averageWineRating(b) - averageWineRating(a))[0];
  const regionWines = wines.filter((wine) => wine.region.en === selectedRegion);

  async function handleIdentify(file: File | null) {
    if (!file) return;
    setIdentifyError('');
    setIdentifyStatus(t('analyzingLabel', language));
    try {
      const [identified, photo] = await Promise.all([
        identifyWineImage(file, language),
        uploadWineImage(file),
      ]);
      setIdentifyStatus(t('readingWineDetails', language));
      setDraft(aiResultToDraft(identified, photo, language));
      setIsAiDraft(true);
      setFormOpen(true);
      if (identified.confidenceScore < 0.35) {
        setIdentifyError(t('labelUnclear', language));
      }
      setIdentifyStatus(t('preparingTastingProfile', language));
      window.setTimeout(() => setIdentifyStatus(''), 900);
    } catch (error) {
      setIdentifyStatus('');
      setIdentifyError(error instanceof Error ? error.message : t('aiUnavailable', language));
    }
  }

  function startManualWine() {
    setDraft({ ...emptyDraft });
    setIsAiDraft(false);
    setFormOpen(true);
  }

  function editWine(wine: Wine) {
    setDraft(wineToDraft(wine));
    setIsAiDraft(Boolean(wine.confidenceScore || wine.visibleLabelText || wine.warningsOrUncertainty));
    setFormOpen(true);
  }

  function saveDraft() {
    const existingWine = draft.id ? wines.find((wine) => wine.id === draft.id) : undefined;
    const wine = draftToWine(draft, existingWine);
    if (!wine.name.en.trim()) return;
    if (draft.id) updateWine(wine);
    else addWine(wine);
    setFormOpen(false);
    setDraft({ ...emptyDraft });
    setIsAiDraft(false);
  }

  function handleLoadPreview() {
    loadPreview();
    setToast(t('giftPreviewLoaded', language));
    window.setTimeout(() => setToast(''), 2400);
  }

  function addTasting(wineId: string, tasting: TastingEntry) {
    const wine = wines.find((item) => item.id === wineId);
    if (wine) updateWine({ ...wine, tastings: [tasting, ...wine.tastings], consumed: true });
  }

  function addMemory(wineId: string, memory: Memory) {
    const wine = wines.find((item) => item.id === wineId);
    if (wine) updateWine({ ...wine, memories: [memory, ...wine.memories], sharedWith: Array.from(new Set([...wine.sharedWith, ...memory.people])) });
  }

  async function askConcierge() {
    if (!conciergeQuestion.trim()) return;
    setConciergeLoading(true);
    setConciergeError('');
    try {
      const response = await askCellarConcierge(conciergeQuestion, wines.map((wine) => wineToSummary(wine, language)), language);
      setConciergeAnswer(response.warningsOrUncertainty ? `${response.answer}\n\n${response.warningsOrUncertainty}` : response.answer);
    } catch (error) {
      setConciergeError(error instanceof Error ? error.message : t('aiUnavailable', language));
    } finally {
      setConciergeLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-linen text-cellar-950 transition-colors dark:bg-cellar-950 dark:text-linen">
      <header className="sticky top-0 z-50 border-b border-cellar-950/10 bg-linen/85 backdrop-blur-xl dark:border-linen/10 dark:bg-cellar-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <button className="flex min-w-0 items-center gap-3" onClick={() => setSection('cellar')} aria-label={t('appName', language)}>
            <span className="grid h-10 w-10 shrink-0 place-items-center border border-gold/50 bg-cellar-950 text-gold dark:bg-gold dark:text-cellar-950"><WineIcon size={19} /></span>
            <span className="hidden min-w-0 font-serif text-xl sm:block">{t('appName', language)}</span>
          </button>
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => <NavButton key={item.id} item={item} active={section === item.id} language={language} onClick={() => setSection(item.id)} />)}
          </nav>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-cellar-950/15 bg-white/50 dark:border-linen/15 dark:bg-white/5">
              <Languages size={16} className="ml-2 text-gold" />
              <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="control-select w-[78px] sm:w-[122px]" aria-label="Language">
                {languages.map((item) => <option key={item.code} value={item.code}>{item.short} {item.label}</option>)}
              </select>
            </div>
            <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? t('lightMode', language) : t('darkMode', language)}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-3 lg:hidden">
          {navItems.map((item) => <NavButton key={item.id} item={item} active={section === item.id} language={language} onClick={() => setSection(item.id)} />)}
        </nav>
      </header>

      <main>
        {toast && <div className="toast" role="status">{toast}</div>}
        <Hero language={language} wines={wines} loadPreview={handleLoadPreview} />
        <StatusRibbon language={language} />
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <ScanPanel language={language} status={identifyStatus} error={identifyError} onIdentify={handleIdentify} onManual={startManualWine} />
            {formOpen && (
              <WineForm
                draft={draft}
                language={language}
                isAiDraft={isAiDraft}
                setDraft={setDraft}
                onPhoto={async (file) => {
                  const photo = await uploadWineImage(file);
                  setDraft((current) => ({ ...current, photo }));
                }}
                onImageOpen={(src) => setLightboxImage({ src, alt: draft.name || t('bottlePhoto', language) })}
                onSave={saveDraft}
                onCancel={() => setFormOpen(false)}
              />
            )}
            <AnimatePresence mode="wait">
              {section === 'cellar' && (
                <motion.div key="cellar" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                  <SectionTitle icon={WineIcon} title={t('cellarTitle', language)} />
                  <div className="grid gap-3 md:grid-cols-[1fr_170px_150px]">
                    <label className="field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('search', language)} /></label>
                    <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)} className="select-field">
                      <option value="all">{t('allRegions', language)}</option>
                      {regions.map((region) => <option key={region} value={region}>{region}</option>)}
                    </select>
                    <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="select-field">
                      <option value="newest">{t('sortNewest', language)}</option>
                      <option value="value">{t('sortValue', language)}</option>
                      <option value="rating">{t('sortRating', language)}</option>
                    </select>
                  </div>
                  {wines.length === 0 ? <EmptyState language={language} loadPreview={handleLoadPreview} onManual={startManualWine} /> : <WineGrid wines={filteredWines} language={language} onEdit={editWine} onDelete={deleteWine} onImageOpen={(src, alt) => setLightboxImage({ src, alt })} />}
                </motion.div>
              )}
              {section === 'journal' && <Journal key="journal" wines={wines} language={language} onAddTasting={addTasting} />}
              {section === 'memories' && <Memories key="memories" wines={wines} language={language} onAddMemory={addMemory} />}
              {section === 'concierge' && <Concierge key="concierge" language={language} question={conciergeQuestion} answer={conciergeAnswer} error={conciergeError} loading={conciergeLoading} setQuestion={setConciergeQuestion} ask={askConcierge} />}
              {section === 'legacy' && <Legacy key="legacy" wines={wines} language={language} />}
            </AnimatePresence>
          </section>
          <aside className="space-y-6">
            <Analytics language={language} analytics={analytics} valueByRegion={valueByRegion} rarityData={rarityData} />
            <FamilyDashboard language={language} sharedWithYimo={sharedWithYimo} familyShared={familyShared} favouriteShared={favouriteShared} />
            <WineMap language={language} wines={wines} selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} regionWines={regionWines} />
          </aside>
        </div>
      </main>
      {lightboxImage && <ImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />}
    </div>
  );
}

function NavButton({ item, active, language, onClick }: { item: (typeof navItems)[number]; active: boolean; language: Language; onClick: () => void }) {
  return <button onClick={onClick} className={`nav-button shrink-0 ${active ? 'nav-button-active' : ''}`}><item.icon size={16} />{t(item.label, language)}</button>;
}

function Hero({ language, wines, loadPreview }: { language: Language; wines: Wine[]; loadPreview: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <section className="relative isolate min-h-[560px] overflow-hidden">
      {imageFailed ? (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(217,180,108,.22),transparent_28%),linear-gradient(135deg,#1d1510,#7d1f2f_48%,#120d0a)]" aria-hidden="true" />
      ) : (
        <img src={heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setImageFailed(true)} />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-cellar-950 via-cellar-950/72 to-cellar-950/20" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-linen dark:from-cellar-950" />
      <div className="relative mx-auto flex min-h-[560px] max-w-7xl items-center px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-3xl text-linen">
          <p className="mb-5 inline-flex items-center gap-2 border border-gold/45 bg-cellar-950/40 px-3 py-2 text-xs uppercase tracking-[0.26em] text-gold"><Sparkles size={14} />Father’s Day 2026</p>
          <h1 className="font-serif text-5xl leading-[0.95] sm:text-7xl lg:text-8xl">{t('heroTitle', language)}</h1>
          <p className="mt-6 max-w-2xl text-xl text-linen/85 sm:text-2xl">{t('heroSubtitle', language)}</p>
          <p className="mt-4 font-serif text-2xl text-gold">{t('heroGift', language)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="primary-button" onClick={loadPreview}><Plus size={18} />{t('sampleData', language)}</button>
            <a href="#cellar" className="secondary-button"><ChevronRight size={18} />{t('navCellar', language)}</a>
          </div>
          {wines.length > 0 && <p className="mt-4 text-sm text-linen/70">{t('estimatedNotice', language)}</p>}
        </motion.div>
      </div>
    </section>
  );
}

function StatusRibbon({ language }: { language: Language }) {
  return (
    <div className="border-y border-cellar-950/10 bg-white/55 dark:border-linen/10 dark:bg-white/[0.04]">
      <div className="mx-auto flex max-w-7xl flex-wrap gap-3 px-4 py-3 text-sm text-cellar-700 dark:text-linen/75">
        <span className="status-pill"><Globe2 size={15} />{t('secureAiBackend', language)}</span>
        <span className="status-pill"><Sparkles size={15} />Supabase {supabase ? t('configured', language) : t('notConfigured', language)}</span>
        <span className="status-pill"><Languages size={15} />English · 简体中文 · Français</span>
      </div>
    </div>
  );
}

function ScanPanel({ language, status, error, onIdentify, onManual }: { language: Language; status: string; error: string; onIdentify: (file: File | null) => void; onManual: () => void }) {
  return (
    <section className="lux-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionTitle icon={Camera} title={t('scanTitle', language)} />
        <span className="badge badge-gold">OpenAI</span>
      </div>
      <p className="mt-3 text-sm text-cellar-700 dark:text-linen/70">{t('scanAiBody', language)}</p>
      {status && <p className="mt-4 border border-gold/30 bg-gold/10 p-3 text-sm text-gold">{status}</p>}
      {error && <p className="mt-4 border border-claret/35 bg-claret/10 p-3 text-sm text-claret">{error}</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <UploadButton icon={Camera} label={t('uploadBottle', language)} accept="image/*" capture="environment" onFile={onIdentify} />
        <UploadButton icon={Upload} label={t('uploadList', language)} accept="image/*" onFile={onIdentify} />
        <button className="manual-button" type="button" onClick={onManual}><Plus size={18} />{t('addManual', language)}</button>
      </div>
      <p className="mt-5 text-sm text-cellar-700 dark:text-linen/70">{t('estimatedNotice', language)}</p>
    </section>
  );
}

function UploadButton({ icon: Icon, label, accept, capture, onFile }: { icon: typeof Camera; label: string; accept: string; capture?: 'environment'; onFile: (file: File | null) => void }) {
  return <label className="manual-button cursor-pointer"><Icon size={18} /><span>{label}</span><input type="file" className="sr-only" accept={accept} capture={capture} onChange={(event) => onFile(event.target.files?.[0] || null)} /></label>;
}

function WineForm({ draft, language, isAiDraft, setDraft, onPhoto, onImageOpen, onSave, onCancel }: { draft: WineDraft; language: Language; isAiDraft: boolean; setDraft: React.Dispatch<React.SetStateAction<WineDraft>>; onPhoto: (file: File) => void; onImageOpen: (src: string) => void; onSave: () => void; onCancel: () => void }) {
  const set = (key: keyof WineDraft, value: string | boolean) => setDraft((current) => ({ ...current, [key]: value }));
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => setPhotoFailed(false), [draft.photo]);
  return (
    <section className="lux-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle icon={Save} title={t('wineDetails', language)} />
        {isAiDraft && <span className="badge badge-gold">{t('aiReviewed', language)}</span>}
      </div>
      {isAiDraft && <p className="mt-3 text-sm text-cellar-700 dark:text-linen/70">{t('aiReviewBody', language)}</p>}
      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(260px,340px)_1fr]">
        <div>
          <div className="photo-drop">
            {draft.photo && !photoFailed ? (
              <button type="button" className="photo-preview-button" onClick={() => onImageOpen(draft.photo || '')} aria-label={t('enlargeImage', language)}>
                <img src={draft.photo} alt={draft.name || t('bottlePhoto', language)} onError={() => setPhotoFailed(true)} />
              </button>
            ) : draft.photo && photoFailed ? (
              <div className="image-fallback"><Camera size={28} /><span>{t('imageUnavailable', language)}</span></div>
            ) : (
              <label className="grid h-full min-h-72 cursor-pointer place-items-center gap-3">
                <Camera size={34} />
                <span>{t('bottlePhoto', language)}</span>
                <input type="file" className="sr-only" accept="image/*" onChange={(event) => event.target.files?.[0] && onPhoto(event.target.files[0])} />
              </label>
            )}
          </div>
          {draft.photo && (
            <div className="photo-actions">
              <button className="small-button" type="button" onClick={() => onImageOpen(draft.photo || '')}><Camera size={15} />{t('enlargeImage', language)}</button>
              <label className="small-button cursor-pointer"><Upload size={15} />{t('changePhoto', language)}<input type="file" className="sr-only" accept="image/*" onChange={(event) => {
                if (event.target.files?.[0]) {
                  setPhotoFailed(false);
                  onPhoto(event.target.files[0]);
                }
              }} /></label>
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={t('name', language)} value={draft.name} onChange={(value) => set('name', value)} required />
          <TextField label={t('producer', language)} value={draft.producer} onChange={(value) => set('producer', value)} />
          <TextField label={t('vintage', language)} value={draft.vintage} onChange={(value) => set('vintage', value)} />
          <TextField label={t('country', language)} value={draft.country} onChange={(value) => set('country', value)} />
          <TextField label={t('region', language)} value={draft.region} onChange={(value) => set('region', value)} />
          <TextField label={t('grape', language)} value={draft.grape} onChange={(value) => set('grape', value)} />
          <label className="form-label">{t('tastingProfile', language)}<textarea value={draft.tastingProfile} onChange={(event) => set('tastingProfile', event.target.value)} /></label>
          <label className="form-label">{t('foodPairings', language)}<textarea value={draft.foodPairings} onChange={(event) => set('foodPairings', event.target.value)} /></label>
          <TextField label={t('drinkingWindow', language)} value={draft.drinkingWindow} onChange={(value) => set('drinkingWindow', value)} />
          <TextField label={t('priceRange', language)} value={draft.estimatedPriceRange} onChange={(value) => set('estimatedPriceRange', value)} />
          <p className="text-xs text-cellar-700 dark:text-linen/60 sm:col-span-2">{t('priceNotLive', language)}</p>
          <TextField label={`${t('marketValue', language)} (${t('optionalNumber', language)})`} value={draft.estimatedValue} onChange={(value) => set('estimatedValue', value)} type="number" />
          <label className="form-label">{t('style', language)}<select value={draft.style} onChange={(event) => set('style', event.target.value)}>{Object.keys(styleLabels).map((style) => <option key={style} value={style}>{styleLabels[style as WineStyle][language]}</option>)}</select></label>
          <label className="form-label">{t('rarity', language)}<select value={draft.rarity} onChange={(event) => set('rarity', event.target.value)}>{Object.keys(rarityLabels).map((rarity) => <option key={rarity} value={rarity}>{rarityLabels[rarity as Rarity][language]}</option>)}</select></label>
          <TextField label={t('confidenceScore', language)} value={draft.confidenceScore} onChange={(value) => set('confidenceScore', value)} type="number" />
          <label className="form-label">{t('visibleLabelText', language)}<textarea value={draft.visibleLabelText} onChange={(event) => set('visibleLabelText', event.target.value)} /></label>
          <TextField label={t('location', language)} value={draft.location} onChange={(value) => set('location', value)} />
          <TextField label={t('sharedWith', language)} value={draft.sharedWith} onChange={(value) => set('sharedWith', value)} />
          <label className="form-label sm:col-span-2">{t('warningsOrUncertainty', language)}<textarea value={draft.warningsOrUncertainty} onChange={(event) => set('warningsOrUncertainty', event.target.value)} /></label>
          <label className="form-label sm:col-span-2">{t('notes', language)}<textarea value={draft.notes} onChange={(event) => set('notes', event.target.value)} /></label>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button className="primary-button" onClick={onSave}><Save size={18} />{draft.id ? t('updateWine', language) : t('saveWine', language)}</button>
        <button className="manual-button" onClick={onCancel}><X size={18} />{t('cancel', language)}</button>
      </div>
    </section>
  );
}

function WineGrid({ wines, language, onEdit, onDelete, onImageOpen }: { wines: Wine[]; language: Language; onEdit: (wine: Wine) => void; onDelete: (id: string) => void; onImageOpen: (src: string, alt: string) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {wines.map((wine) => (
        <article key={wine.id} className="wine-card">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="wine-photo">{wine.photo ? <button type="button" className="wine-photo-button" onClick={() => onImageOpen(wine.photo || '', text(wine.name, language))} aria-label={t('enlargeImage', language)}><img src={wine.photo} alt={text(wine.name, language)} /></button> : <WineIcon size={36} />}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-serif text-2xl">{text(wine.name, language)}</h3>
                  <p className="text-sm text-cellar-700 dark:text-linen/70">{wine.producer} · {wine.vintage}</p>
                </div>
                <span className={`badge rarity-${wine.rarity}`}>{rarityLabels[wine.rarity][language]}</span>
              </div>
              <p className="mt-3 text-sm text-cellar-800 dark:text-linen/80">{text(wine.region, language)}, {text(wine.country, language)} · {text(wine.grape, language)}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <Metric label={t('priceRange', language)} value={wine.estimatedPriceRange || (wine.estimatedValue ? `£${wine.estimatedValue.toLocaleString()}` : '—')} />
                <Metric label={<Star size={13} />} value={averageWineRating(wine).toFixed(1)} />
                <Metric label={<Users size={13} />} value={wine.sharedWith.length} />
              </div>
              <p className="mt-4 line-clamp-2 text-sm text-cellar-700 dark:text-linen/70">{text(wine.tastingProfile, language)}</p>
              {wine.warningsOrUncertainty && <p className="mt-3 text-xs text-claret">{wine.warningsOrUncertainty}</p>}
              <div className="mt-4 flex gap-2">
                <button className="small-button" onClick={() => onEdit(wine)}><Edit3 size={15} />{t('edit', language)}</button>
                <button className="small-button danger" onClick={() => onDelete(wine.id)}><Trash2 size={15} />{t('delete', language)}</button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function Journal({ wines, language, onAddTasting }: { wines: Wine[]; language: Language; onAddTasting: (wineId: string, tasting: TastingEntry) => void }) {
  const entries = wines.flatMap((wine) => wine.tastings.map((tasting) => ({ wine, tasting })));
  const [selectedWine, setSelectedWine] = useState(wines[0]?.id || '');
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>(['Family Dinner']);
  useEffect(() => { if (!selectedWine && wines[0]) setSelectedWine(wines[0].id); }, [selectedWine, wines]);
  function save() {
    if (!selectedWine || !notes.trim()) return;
    onAddTasting(selectedWine, { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), rating, notes: sameText(notes), impressions: sameText(notes), tags });
    setNotes('');
  }
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <SectionTitle icon={BookOpen} title={t('journalTitle', language)} />
      <EntryForm language={language} wines={wines} selectedWine={selectedWine} setSelectedWine={setSelectedWine}>
        <label className="form-label">{t('rating', language)}<input type="number" min="1" max="5" value={rating} onChange={(event) => setRating(Number(event.target.value))} /></label>
        <label className="form-label sm:col-span-2">{t('notes', language)}<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <TagPicker language={language} selected={tags} setSelected={setTags} />
        <button className="primary-button" onClick={save}><Save size={18} />{t('saveTasting', language)}</button>
      </EntryForm>
      {entries.length === 0 && <p className="lux-panel text-cellar-700 dark:text-linen/70">{t('noEntries', language)}</p>}
      {entries.map(({ wine, tasting }) => <JournalCard key={tasting.id} wine={wine} tasting={tasting} language={language} />)}
    </motion.section>
  );
}

function Memories({ wines, language, onAddMemory }: { wines: Wine[]; language: Language; onAddMemory: (wineId: string, memory: Memory) => void }) {
  const memories = wines.flatMap((wine) => wine.memories.map((memory) => ({ wine, memory }))).sort((a, b) => b.memory.date.localeCompare(a.memory.date));
  const [selectedWine, setSelectedWine] = useState(wines[0]?.id || '');
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [location, setLocation] = useState('');
  const [people, setPeople] = useState('Jay, Yimo, Susan');
  useEffect(() => { if (!selectedWine && wines[0]) setSelectedWine(wines[0].id); }, [selectedWine, wines]);
  function save() {
    if (!selectedWine || !title.trim()) return;
    onAddMemory(selectedWine, { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), title: sameText(title), story: sameText(story), location, people: splitList(people), photos: [] });
    setTitle('');
    setStory('');
  }
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <SectionTitle icon={Heart} title={t('memoriesTitle', language)} />
      <EntryForm language={language} wines={wines} selectedWine={selectedWine} setSelectedWine={setSelectedWine}>
        <TextField label={t('memoryTitle', language)} value={title} onChange={setTitle} />
        <TextField label={t('location', language)} value={location} onChange={setLocation} />
        <TextField label={t('peoplePresent', language)} value={people} onChange={setPeople} />
        <label className="form-label sm:col-span-2">{t('memoryStory', language)}<textarea value={story} onChange={(event) => setStory(event.target.value)} /></label>
        <button className="primary-button" onClick={save}><Save size={18} />{t('saveMemory', language)}</button>
      </EntryForm>
      {memories.length === 0 && <p className="lux-panel text-cellar-700 dark:text-linen/70">{t('noEntries', language)}</p>}
      <div className="relative space-y-4 before:absolute before:left-4 before:top-2 before:h-full before:w-px before:bg-gold/35">
        {memories.map(({ wine, memory }) => (
          <article key={memory.id} className="relative ml-10 lux-panel">
            <span className="absolute -left-[34px] top-6 h-4 w-4 border border-gold bg-garnet" />
            <p className="text-sm text-gold">{memory.date} · {memory.location}</p>
            <h3 className="mt-2 font-serif text-2xl">{text(memory.title, language)}</h3>
            <p className="mt-2 text-cellar-800 dark:text-linen/80">{text(memory.story, language)}</p>
            <p className="mt-3 text-sm text-cellar-700 dark:text-linen/65">{text(wine.name, language)} · {memory.people.join(', ')}</p>
          </article>
        ))}
      </div>
    </motion.section>
  );
}

function Concierge({ language, question, answer, error, loading, setQuestion, ask }: { language: Language; question: string; answer: string; error: string; loading: boolean; setQuestion: (value: string) => void; ask: () => void }) {
  const examples = {
    en: ['What should I drink tonight with steak?', 'Which wine has the highest estimate?', 'Which wines are ready to drink?'],
    zh: ['今晚配牛排喝什么？', '哪一瓶估算价值最高？', '哪些酒现在适饮？'],
    fr: ['Que boire ce soir avec un steak ?', 'Quel vin a la plus haute estimation ?', 'Quels vins sont prêts à boire ?'],
  };
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lux-panel">
      <div className="flex flex-wrap items-center justify-between gap-3"><SectionTitle icon={Bot} title={t('conciergeTitle', language)} /><span className="badge badge-gold">OpenAI</span></div>
      <p className="mt-3 text-sm text-cellar-700 dark:text-linen/70">{t('conciergeAiBody', language)}</p>
      <div className="mt-5 flex gap-2">
        <input className="question-input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t('conciergeAsk', language)} />
        <button className="icon-button strong" onClick={ask} aria-label={t('conciergeAsk', language)} disabled={loading}><Sparkles size={18} /></button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{examples[language].map((item) => <button key={item} className="tag" onClick={() => setQuestion(item)}>{item}</button>)}</div>
      {loading && <p className="mt-5 border border-gold/30 bg-gold/10 p-3 text-sm text-gold">{t('thinkingWithCellar', language)}</p>}
      {error && <p className="mt-5 border border-claret/35 bg-claret/10 p-3 text-sm text-claret">{error}</p>}
      {answer && <p className="mt-5 whitespace-pre-line border-l-2 border-gold pl-4 text-lg text-cellar-800 dark:text-linen/80">{answer}</p>}
    </motion.section>
  );
}

function Analytics({ language, analytics, valueByRegion, rarityData }: { language: Language; analytics: ReturnType<typeof useCollection>['analytics']; valueByRegion: Array<{ name: string; value: number }>; rarityData: Array<{ name: string; value: number }> }) {
  return (
    <section className="lux-panel">
      <div className="flex flex-wrap items-center justify-between gap-3"><SectionTitle icon={BarChart3} title={t('analyticsTitle', language)} /><span className="badge badge-gold">{t('functional', language)}</span></div>
      <p className="mt-3 text-sm text-cellar-700 dark:text-linen/70">{t('estimatedNotice', language)}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric label={t('totalWines', language)} value={analytics.total} />
        <Metric label={`${t('collectionValue', language)} (${t('estimate', language)})`} value={`£${analytics.value.toLocaleString()}`} />
        <Metric label={t('averageRating', language)} value={analytics.averageRating.toFixed(1)} />
        <Metric label={t('consumedYear', language)} value={analytics.consumedThisYear} />
      </div>
      <div className="mt-4 space-y-2 text-sm text-cellar-700 dark:text-linen/70">
        <p>{t('favouriteCountry', language)}: {analytics.favouriteCountry}</p>
        <p>{t('favouriteGrape', language)}: {analytics.favouriteGrape}</p>
        <p>{t('commonRegion', language)}: {analytics.commonRegion}</p>
      </div>
      <div className="mt-5 h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={valueByRegion}><CartesianGrid strokeDasharray="3 3" stroke="rgba(217,180,108,0.18)" /><XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 11 }} /><YAxis tick={{ fill: 'currentColor', fontSize: 11 }} /><Tooltip contentStyle={{ background: '#1d1510', border: '1px solid rgba(217,180,108,.35)', color: '#f3eadb' }} /><Bar dataKey="value" fill="#d9b46c" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
      <div className="mt-3 h-40"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={rarityData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={64}>{rarityData.map((_, index) => <Cell key={index} fill={['#d9b46c', '#9b2f43', '#748064', '#c7794a', '#f3eadb'][index % 5]} />)}</Pie><Tooltip contentStyle={{ background: '#1d1510', border: '1px solid rgba(217,180,108,.35)', color: '#f3eadb' }} /></PieChart></ResponsiveContainer></div>
    </section>
  );
}

function FamilyDashboard({ language, sharedWithYimo, familyShared, favouriteShared }: { language: Language; sharedWithYimo: Wine[]; familyShared: Wine[]; favouriteShared?: Wine }) {
  return (
    <section className="lux-panel">
      <SectionTitle icon={Users} title={t('sharedTitle', language)} />
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric label={language === 'zh' ? '与奕谟共享' : language === 'fr' ? 'Partagés avec Yimo' : 'Shared with Yimo'} value={sharedWithYimo.length} />
        <Metric label={language === 'zh' ? '与家人共享' : language === 'fr' ? 'Partagés en famille' : 'Shared with family'} value={familyShared.length} />
      </div>
      {favouriteShared && <div className="mt-4 border border-gold/25 bg-gold/10 p-4"><p className="text-sm text-gold">{language === 'zh' ? '最爱的共享酒款' : language === 'fr' ? 'Bouteille partagée favorite' : 'Favourite shared bottle'}</p><p className="mt-1 font-serif text-2xl">{text(favouriteShared.name, language)}</p><p className="text-sm text-cellar-700 dark:text-linen/70">{favouriteShared.sharedWith.join(', ')}</p></div>}
    </section>
  );
}

function WineMap({ language, wines, selectedRegion, setSelectedRegion, regionWines }: { language: Language; wines: Wine[]; selectedRegion: string; setSelectedRegion: (region: string) => void; regionWines: Wine[] }) {
  const represented = new Set(wines.map((wine) => wine.region.en));
  return (
    <section className="lux-panel">
      <div className="flex flex-wrap items-center justify-between gap-3"><SectionTitle icon={MapPinned} title={t('mapTitle', language)} /><span className="badge badge-gold">{t('functional', language)}</span></div>
      <div className="wine-map mt-5">
        {regions.map((region) => <button key={region} className={`map-pin ${represented.has(region) ? 'map-pin-active' : ''} ${selectedRegion === region ? 'map-pin-selected' : ''}`} style={{ left: regionPositions[region].x, top: regionPositions[region].y }} onClick={() => setSelectedRegion(region)} aria-label={region}><span /></button>)}
      </div>
      <div className="mt-4">
        <p className="font-serif text-xl">{selectedRegion}</p>
        <p className="text-sm text-cellar-700 dark:text-linen/70">{regionWines.length ? regionWines.map((wine) => text(wine.name, language)).join(' · ') : language === 'zh' ? '尚未收藏该产区酒款' : language === 'fr' ? 'Aucun vin de cette région' : 'No wines from this region yet'}</p>
      </div>
    </section>
  );
}

function Legacy({ wines, language }: { wines: Wine[]; language: Language }) {
  const highestRated = [...wines].sort((a, b) => averageWineRating(b) - averageWineRating(a)).slice(0, 3);
  const memorable = wines.flatMap((wine) => wine.memories.map((memory) => ({ wine, memory }))).slice(0, 4);
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="legacy-hero" style={{ backgroundImage: `linear-gradient(135deg, rgba(125, 31, 47, 0.45), rgba(18, 13, 10, 0.92)), url(${heroImageUrl})` }}>
        <Crown size={30} />
        <h2>{t('legacyTitle', language)}</h2>
        <p>{language === 'zh' ? '把年份、团圆、庆祝与父子之间的心意，珍藏成可以慢慢回看的家族故事。' : language === 'fr' ? 'Préserver les millésimes, les célébrations et les gestes d’un fils pour son père comme une histoire familiale à relire.' : 'Preserving vintages, celebrations, and a son’s gift to his father as a family story worth returning to.'}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{highestRated.map((wine) => <article key={wine.id} className="lux-panel"><span className="badge badge-gold">{averageWineRating(wine).toFixed(1)} ★</span><h3 className="mt-3 font-serif text-2xl">{text(wine.name, language)}</h3><p className="mt-2 text-sm text-cellar-700 dark:text-linen/70">{text(wine.notes, language)}</p></article>)}</div>
      {memorable.length === 0 && <p className="lux-panel text-cellar-700 dark:text-linen/70">{t('noEntries', language)}</p>}
      {memorable.map(({ wine, memory }) => <article key={memory.id} className="lux-panel"><p className="text-sm text-gold">{memory.date}</p><h3 className="font-serif text-2xl">{text(memory.title, language)}</h3><p className="mt-2 text-cellar-800 dark:text-linen/80">{text(memory.story, language)}</p><p className="mt-3 text-sm text-cellar-700 dark:text-linen/70">{text(wine.name, language)}</p></article>)}
    </motion.section>
  );
}

function EmptyState({ language, loadPreview, onManual }: { language: Language; loadPreview: () => void; onManual: () => void }) {
  return <div className="empty-state"><WineIcon size={42} /><h3>{t('emptyTitle', language)}</h3><p>{t('emptyBody', language)}</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button className="primary-button" onClick={onManual}><Plus size={18} />{t('addManual', language)}</button><button className="manual-button" onClick={loadPreview}><Sparkles size={18} />{t('sampleData', language)}</button></div></div>;
}

function ImageLightbox({ image, onClose }: { image: { src: string; alt: string }; onClose: () => void }) {
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={image.alt} onClick={onClose}>
      <div className="lightbox-panel" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button absolute right-3 top-3" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <img src={image.src} alt={image.alt} />
      </div>
    </div>
  );
}

function EntryForm({ language, wines, selectedWine, setSelectedWine, children }: { language: Language; wines: Wine[]; selectedWine: string; setSelectedWine: (value: string) => void; children: React.ReactNode }) {
  return (
    <div className="lux-panel">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="form-label sm:col-span-2">{t('cellarTitle', language)}<select value={selectedWine} onChange={(event) => setSelectedWine(event.target.value)}>{wines.map((wine) => <option key={wine.id} value={wine.id}>{text(wine.name, language)}</option>)}</select></label>
        {children}
      </div>
    </div>
  );
}

function JournalCard({ wine, tasting, language }: { wine: Wine; tasting: TastingEntry; language: Language }) {
  return <article className="lux-panel"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-serif text-2xl">{text(wine.name, language)} · {wine.vintage}</h3><p className="text-sm text-cellar-700 dark:text-linen/70">{tasting.date}</p></div><StarRating rating={tasting.rating} /></div><p className="mt-4 text-cellar-800 dark:text-linen/80">{text(tasting.notes, language)}</p><div className="mt-4 flex flex-wrap gap-2">{tasting.tags.map((tag) => <span key={tag} className="tag">{tagLabels[tag]?.[language] || tag}</span>)}</div></article>;
}

function TagPicker({ language, selected, setSelected }: { language: Language; selected: string[]; setSelected: (tags: string[]) => void }) {
  return <div className="sm:col-span-2"><p className="mb-2 text-xs uppercase tracking-[0.16em] text-cellar-700 dark:text-linen/60">{t('occasionTags', language)}</p><div className="flex flex-wrap gap-2">{occasionTags.map((tag) => <button key={tag} className={`tag ${selected.includes(tag) ? 'tag-active' : ''}`} onClick={() => setSelected(selected.includes(tag) ? selected.filter((item) => item !== tag) : [...selected, tag])}>{tagLabels[tag][language]}</button>)}</div></div>;
}

function TextField({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="form-label">{label}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SectionTitle({ icon: Icon, title }: { icon: typeof WineIcon; title: string }) {
  return <div className="flex items-center gap-3"><span className="section-icon"><Icon size={18} /></span><h2 className="font-serif text-3xl">{title}</h2></div>;
}

function Metric({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function StarRating({ rating }: { rating: number }) {
  return <div className="flex text-gold">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={18} fill={index < rating ? 'currentColor' : 'none'} />)}</div>;
}

function averageWineRating(wine: Wine) {
  if (!wine.tastings.length) return 0;
  return wine.tastings.reduce((sum, tasting) => sum + tasting.rating, 0) / wine.tastings.length;
}

function wineToDraft(wine: Wine): WineDraft {
  return {
    id: wine.id,
    photo: wine.photo,
    name: wine.name.en,
    producer: wine.producer,
    vintage: wine.vintage,
    country: wine.country.en,
    region: wine.region.en,
    grape: wine.grape.en,
    style: wine.style,
    estimatedValue: wine.estimatedValue ? String(wine.estimatedValue) : '',
    estimatedPriceRange: wine.estimatedPriceRange || '',
    confidenceScore: typeof wine.confidenceScore === 'number' ? String(wine.confidenceScore) : '',
    visibleLabelText: wine.visibleLabelText || '',
    warningsOrUncertainty: wine.warningsOrUncertainty || '',
    drinkingWindow: wine.drinkingWindow.en,
    tastingProfile: wine.tastingProfile.en,
    foodPairings: wine.foodPairings.en,
    facts: wine.facts.en,
    notes: wine.notes.en,
    location: wine.location,
    rarity: wine.rarity,
    consumed: wine.consumed,
    sharedWith: wine.sharedWith.join(', '),
  };
}

function draftToWine(draft: WineDraft, existingWine?: Wine): Wine {
  return {
    id: draft.id || crypto.randomUUID(),
    photo: draft.photo,
    name: sameText(draft.name),
    producer: draft.producer,
    vintage: draft.vintage,
    country: sameText(draft.country),
    region: sameText(draft.region),
    grape: sameText(draft.grape),
    style: draft.style,
    estimatedValue: Number(draft.estimatedValue) || 0,
    estimatedPriceRange: draft.estimatedPriceRange,
    confidenceScore: draft.confidenceScore ? Number(draft.confidenceScore) : undefined,
    visibleLabelText: draft.visibleLabelText,
    warningsOrUncertainty: draft.warningsOrUncertainty,
    drinkingWindow: sameText(draft.drinkingWindow),
    tastingProfile: sameText(draft.tastingProfile),
    foodPairings: sameText(draft.foodPairings),
    facts: sameText(draft.facts || 'Saved manually.'),
    dateAdded: existingWine?.dateAdded || new Date().toISOString().slice(0, 10),
    notes: sameText(draft.notes),
    location: draft.location,
    rarity: draft.rarity,
    consumed: draft.consumed,
    sharedWith: splitList(draft.sharedWith),
    tastings: existingWine?.tastings || [],
    memories: existingWine?.memories || [],
  };
}

function sameText(value: string): TranslationText {
  return makeText(value, value, value);
}

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function aiResultToDraft(result: AiWineIdentification, photo: string, language: Language): WineDraft {
  const vintageUnknown = isUnknownVintage(result.vintage);
  const warnings = [
    result.warningsOrUncertainty,
    vintageUnknown ? t('vintageUnclearPrompt', language) : '',
  ].filter(Boolean).join(' ');
  return {
    ...emptyDraft,
    photo,
    name: result.wineName,
    producer: result.producer,
    vintage: vintageUnknown ? 'Unknown' : result.vintage,
    country: result.country,
    region: result.region,
    grape: result.grapeVarieties,
    style: result.wineStyle,
    estimatedPriceRange: result.estimatedPriceRange,
    confidenceScore: String(vintageUnknown ? Math.max(0, Number((result.confidenceScore - 0.15).toFixed(2))) : result.confidenceScore),
    visibleLabelText: result.visibleLabelText,
    warningsOrUncertainty: warnings,
    drinkingWindow: vintageUnknown ? t('dependsOnVintage', language) : result.drinkingWindow,
    tastingProfile: result.tastingProfile,
    foodPairings: result.foodPairings,
    facts: result.interestingFacts,
    notes: warnings,
    rarity: result.rarityLevel,
    location: 'Review shelf',
    sharedWith: 'Jay',
  };
}

function isUnknownVintage(vintage: string) {
  return !vintage.trim() || /unknown|unclear|not visible|n\/a|non visible|inconnu|不详|未知|看不清/i.test(vintage);
}

function wineToSummary(wine: Wine, language: Language): WineSummary {
  return {
    id: wine.id,
    name: text(wine.name, language),
    producer: wine.producer,
    vintage: wine.vintage,
    country: text(wine.country, language),
    region: text(wine.region, language),
    grape: text(wine.grape, language),
    style: wine.style,
    estimatedPriceRange: wine.estimatedPriceRange,
    estimatedValue: wine.estimatedValue,
    drinkingWindow: text(wine.drinkingWindow, language),
    rating: averageWineRating(wine),
    notes: text(wine.notes, language),
    location: wine.location,
    rarity: wine.rarity,
    sharedWith: wine.sharedWith,
    tastings: wine.tastings.map((tasting) => ({
      rating: tasting.rating,
      notes: text(tasting.notes, language),
      tags: tasting.tags,
      date: tasting.date,
    })),
    memories: wine.memories.map((memory) => ({
      title: text(memory.title, language),
      story: text(memory.story, language),
      people: memory.people,
      date: memory.date,
    })),
  };
}
