import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Bot,
  Camera,
  ChevronRight,
  Crown,
  Globe2,
  Heart,
  Languages,
  MapPinned,
  Moon,
  Plus,
  Search,
  Sparkles,
  Star,
  Sun,
  Upload,
  Users,
  Wine as WineIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { identifyWineFromUpload } from './lib/ai';
import { languages, t, text } from './lib/i18n';
import { getStoredLanguage, getStoredTheme, storeLanguage, storeTheme } from './lib/storage';
import { supabase, uploadWineImage } from './lib/supabase';
import { useCollection } from './hooks/useCollection';
import type { Language, Rarity, Wine } from './types/wine';

const navItems = [
  { id: 'cellar', label: 'navCellar', icon: WineIcon },
  { id: 'journal', label: 'navJournal', icon: BookOpen },
  { id: 'memories', label: 'navMemories', icon: Heart },
  { id: 'concierge', label: 'navConcierge', icon: Bot },
  { id: 'legacy', label: 'navLegacy', icon: Crown },
] as const;

const rarityLabels: Record<Rarity, Record<Language, string>> = {
  common: { en: 'Common', zh: '常见', fr: 'Commun' },
  uncommon: { en: 'Uncommon', zh: '少见', fr: 'Peu commun' },
  rare: { en: 'Rare', zh: '稀有', fr: 'Rare' },
  veryRare: { en: 'Very Rare', zh: '极稀有', fr: 'Très rare' },
  collectible: { en: 'Collectible', zh: '收藏级', fr: 'De collection' },
};

const tagLabels: Record<string, Record<Language, string>> = {
  Celebration: { en: 'Celebration', zh: '庆祝', fr: 'Célébration' },
  'Family Dinner': { en: 'Family Dinner', zh: '家庭晚餐', fr: 'Dîner familial' },
  'Business Dinner': { en: 'Business Dinner', zh: '商务晚宴', fr: 'Dîner d’affaires' },
  Holiday: { en: 'Holiday', zh: '节日', fr: 'Fête' },
  Anniversary: { en: 'Anniversary', zh: '纪念日', fr: 'Anniversaire' },
  'Special Bottle': { en: 'Special Bottle', zh: '特别酒款', fr: 'Bouteille spéciale' },
};

const regions = ['Bordeaux', 'Burgundy', 'Champagne', 'Rhône Valley', 'Tuscany', 'Piedmont', 'Rioja', 'Napa Valley', 'Barossa Valley', 'Mendoza'];

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

export function App() {
  const { wines, analytics, addWine, loadPreview } = useCollection();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getStoredTheme());
  const [section, setSection] = useState<(typeof navItems)[number]['id']>('cellar');
  const [query, setQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [sort, setSort] = useState<'newest' | 'value' | 'rating'>('newest');
  const [selectedRegion, setSelectedRegion] = useState('Bordeaux');
  const [conciergeQuestion, setConciergeQuestion] = useState('');
  const [conciergeAnswer, setConciergeAnswer] = useState('');

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
        const matchesQuery = haystack.includes(query.toLowerCase());
        const matchesRegion = regionFilter === 'all' || wine.region.en === regionFilter;
        return matchesQuery && matchesRegion;
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

  const onLanguageChange = (next: Language) => setLanguage(next);
  const onThemeToggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  async function handleIdentify(file: File | null) {
    if (!file) return;
    const identified = identifyWineFromUpload(file.name);
    identified.photo = await uploadWineImage(file);
    addWine(identified);
  }

  function askConcierge() {
    const ready = wines.filter((wine) => wine.drinkingWindow.en.toLowerCase().includes('now'));
    const top = [...wines].sort((a, b) => b.estimatedValue - a.estimatedValue)[0];
    const steak = wines.find((wine) => wine.foodPairings.en.toLowerCase().includes('steak')) || wines[0];
    const answer = {
      en: `For Jay tonight, I would open ${steak ? text(steak.name, language) : 'a structured red'} if the meal is rich. The most valuable bottle is ${top ? text(top.name, language) : 'not available yet'}. ${ready.length} wine${ready.length === 1 ? '' : 's'} appear ready to drink.`,
      zh: `今晚如果菜肴浓郁，我会建议俊毅开 ${steak ? text(steak.name, language) : '一瓶结构感强的红酒'}。目前估值最高的是 ${top ? text(top.name, language) : '暂无'}。共有 ${ready.length} 款酒处于适饮状态。`,
      fr: `Pour Jay ce soir, j’ouvrirais ${steak ? text(steak.name, language) : 'un rouge structuré'} si le repas est généreux. La bouteille la plus précieuse est ${top ? text(top.name, language) : 'indisponible'}. ${ready.length} vin(s) semblent prêts à boire.`,
    };
    setConciergeAnswer(answer[language]);
  }

  return (
    <div className="min-h-screen bg-linen text-cellar-950 transition-colors dark:bg-cellar-950 dark:text-linen">
      <header className="sticky top-0 z-50 border-b border-cellar-950/10 bg-linen/85 backdrop-blur-xl dark:border-linen/10 dark:bg-cellar-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <button className="flex min-w-0 items-center gap-3" onClick={() => setSection('cellar')} aria-label={t('appName', language)}>
            <span className="grid h-10 w-10 shrink-0 place-items-center border border-gold/50 bg-cellar-950 text-gold dark:bg-gold dark:text-cellar-950">
              <WineIcon size={19} />
            </span>
            <span className="hidden min-w-0 font-serif text-xl sm:block">{t('appName', language)}</span>
          </button>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setSection(item.id)} className={`nav-button ${section === item.id ? 'nav-button-active' : ''}`}>
                <item.icon size={16} />
                {t(item.label, language)}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-cellar-950/15 bg-white/50 dark:border-linen/15 dark:bg-white/5">
              <Languages size={16} className="ml-2 text-gold" />
              <select value={language} onChange={(event) => onLanguageChange(event.target.value as Language)} className="control-select w-[78px] sm:w-[122px]" aria-label="Language">
                {languages.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.short} {item.label}
                  </option>
                ))}
              </select>
            </div>
            <button className="icon-button" onClick={onThemeToggle} aria-label={theme === 'dark' ? t('lightMode', language) : t('darkMode', language)}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-3 lg:hidden">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setSection(item.id)} className={`nav-button shrink-0 ${section === item.id ? 'nav-button-active' : ''}`}>
              <item.icon size={15} />
              {t(item.label, language)}
            </button>
          ))}
        </nav>
      </header>

      <main>
        <Hero language={language} wines={wines} loadPreview={loadPreview} />
        <StatusRibbon language={language} />

        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <ScanPanel language={language} onIdentify={handleIdentify} />
            <AnimatePresence mode="wait">
              {section === 'cellar' && (
                <motion.div key="cellar" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                  <SectionTitle icon={WineIcon} title={t('cellarTitle', language)} />
                  <div className="grid gap-3 md:grid-cols-[1fr_170px_150px]">
                    <label className="field">
                      <Search size={17} />
                      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('search', language)} />
                    </label>
                    <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)} className="select-field">
                      <option value="all">{t('allRegions', language)}</option>
                      {regions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                    <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="select-field">
                      <option value="newest">{t('sortNewest', language)}</option>
                      <option value="value">{t('sortValue', language)}</option>
                      <option value="rating">{t('sortRating', language)}</option>
                    </select>
                  </div>
                  {wines.length === 0 ? <EmptyState language={language} loadPreview={loadPreview} /> : <WineGrid wines={filteredWines} language={language} />}
                </motion.div>
              )}

              {section === 'journal' && <Journal key="journal" wines={wines} language={language} />}
              {section === 'memories' && <Memories key="memories" wines={wines} language={language} />}
              {section === 'concierge' && (
                <Concierge
                  key="concierge"
                  language={language}
                  question={conciergeQuestion}
                  answer={conciergeAnswer}
                  setQuestion={setConciergeQuestion}
                  ask={askConcierge}
                />
              )}
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
    </div>
  );
}

function Hero({ language, wines, loadPreview }: { language: Language; wines: Wine[]; loadPreview: () => void }) {
  return (
    <section className="relative isolate min-h-[560px] overflow-hidden">
      <img src="/cellar-hero.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-cellar-950 via-cellar-950/72 to-cellar-950/20" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-linen dark:from-cellar-950" />
      <div className="relative mx-auto flex min-h-[560px] max-w-7xl items-center px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-3xl text-linen">
          <p className="mb-5 inline-flex items-center gap-2 border border-gold/45 bg-cellar-950/40 px-3 py-2 text-xs uppercase tracking-[0.26em] text-gold">
            <Sparkles size={14} />
            Father’s Day 2026
          </p>
          <h1 className="font-serif text-5xl leading-[0.95] sm:text-7xl lg:text-8xl">{t('heroTitle', language)}</h1>
          <p className="mt-6 max-w-2xl text-xl text-linen/85 sm:text-2xl">{t('heroSubtitle', language)}</p>
          <p className="mt-4 font-serif text-2xl text-gold">{t('heroGift', language)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="primary-button" onClick={loadPreview}>
              <Plus size={18} />
              {wines.length ? t('sampleData', language) : t('sampleData', language)}
            </button>
            <a href="#cellar" className="secondary-button">
              <ChevronRight size={18} />
              {t('navCellar', language)}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatusRibbon({ language }: { language: Language }) {
  return (
    <div className="border-y border-cellar-950/10 bg-white/55 dark:border-linen/10 dark:bg-white/[0.04]">
      <div className="mx-auto flex max-w-7xl flex-wrap gap-3 px-4 py-3 text-sm text-cellar-700 dark:text-linen/75">
        <span className="status-pill"><Globe2 size={15} />{t('offline', language)}</span>
        <span className="status-pill"><Sparkles size={15} />{t('supabaseReady', language)} {supabase ? '✓' : ''}</span>
        <span className="status-pill"><Languages size={15} />English · 简体中文 · Français</span>
      </div>
    </div>
  );
}

function ScanPanel({ language, onIdentify }: { language: Language; onIdentify: (file: File | null) => void }) {
  return (
    <section className="lux-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionTitle icon={Camera} title={t('scanTitle', language)} />
        <span className="badge badge-gold">AI</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <UploadButton icon={Camera} label={t('uploadBottle', language)} accept="image/*" capture="environment" onFile={onIdentify} />
        <UploadButton icon={Upload} label={t('uploadList', language)} accept="image/*,.pdf" onFile={onIdentify} />
        <button className="manual-button" type="button">
          <Plus size={18} />
          {t('addManual', language)}
        </button>
      </div>
      <div className="mt-5 grid gap-3 text-sm text-cellar-700 dark:text-linen/70 md:grid-cols-3">
        <span>{t('marketValue', language)}</span>
        <span>{t('drinkingWindow', language)}</span>
        <span>{t('foodPairings', language)}</span>
      </div>
    </section>
  );
}

function UploadButton({ icon: Icon, label, accept, capture, onFile }: { icon: typeof Camera; label: string; accept: string; capture?: 'environment'; onFile: (file: File | null) => void }) {
  return (
    <label className="manual-button cursor-pointer">
      <Icon size={18} />
      <span>{label}</span>
      <input type="file" className="sr-only" accept={accept} capture={capture} onChange={(event) => onFile(event.target.files?.[0] || null)} />
    </label>
  );
}

function WineGrid({ wines, language }: { wines: Wine[]; language: Language }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {wines.map((wine) => (
        <article key={wine.id} className="wine-card">
          <div className="flex gap-4">
            <div className="wine-photo">{wine.photo ? <img src={wine.photo} alt={text(wine.name, language)} /> : <WineIcon size={36} />}</div>
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
                <Metric label="£" value={wine.estimatedValue.toLocaleString()} />
                <Metric label={<Star size={13} />} value={averageWineRating(wine).toFixed(1)} />
                <Metric label={<Users size={13} />} value={wine.sharedWith.length} />
              </div>
              <p className="mt-4 line-clamp-2 text-sm text-cellar-700 dark:text-linen/70">{text(wine.tastingProfile, language)}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function Journal({ wines, language }: { wines: Wine[]; language: Language }) {
  const entries = wines.flatMap((wine) => wine.tastings.map((tasting) => ({ wine, tasting })));
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <SectionTitle icon={BookOpen} title={t('journalTitle', language)} />
      {entries.map(({ wine, tasting }) => (
        <article key={tasting.id} className="lux-panel">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h3 className="font-serif text-2xl">{text(wine.name, language)} · {wine.vintage}</h3>
              <p className="text-sm text-cellar-700 dark:text-linen/70">{tasting.date}</p>
            </div>
            <StarRating rating={tasting.rating} />
          </div>
          <p className="mt-4 text-cellar-800 dark:text-linen/80">{text(tasting.notes, language)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {tasting.tags.map((tag) => <span key={tag} className="tag">{tagLabels[tag]?.[language] || tag}</span>)}
          </div>
        </article>
      ))}
    </motion.section>
  );
}

function Memories({ wines, language }: { wines: Wine[]; language: Language }) {
  const memories = wines.flatMap((wine) => wine.memories.map((memory) => ({ wine, memory }))).sort((a, b) => b.memory.date.localeCompare(a.memory.date));
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <SectionTitle icon={Heart} title={t('memoriesTitle', language)} />
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

function Concierge({ language, question, answer, setQuestion, ask }: { language: Language; question: string; answer: string; setQuestion: (value: string) => void; ask: () => void }) {
  const examples = {
    en: ['What should I drink tonight with steak?', 'Which wine is the most valuable?', 'Which wines are ready to drink?'],
    zh: ['今晚配牛排喝什么？', '哪一瓶酒最有价值？', '哪些酒现在适饮？'],
    fr: ['Que boire ce soir avec un steak ?', 'Quel vin est le plus précieux ?', 'Quels vins sont prêts à boire ?'],
  };
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lux-panel">
      <SectionTitle icon={Bot} title={t('conciergeTitle', language)} />
      <div className="mt-5 flex gap-2">
        <input className="question-input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t('conciergeAsk', language)} />
        <button className="icon-button strong" onClick={ask} aria-label={t('conciergeAsk', language)}><Sparkles size={18} /></button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {examples[language].map((item) => <button key={item} className="tag" onClick={() => setQuestion(item)}>{item}</button>)}
      </div>
      {answer && <p className="mt-5 border-l-2 border-gold pl-4 text-lg text-cellar-800 dark:text-linen/80">{answer}</p>}
    </motion.section>
  );
}

function Analytics({ language, analytics, valueByRegion, rarityData }: { language: Language; analytics: ReturnType<typeof useCollection>['analytics']; valueByRegion: Array<{ name: string; value: number }>; rarityData: Array<{ name: string; value: number }> }) {
  return (
    <section className="lux-panel">
      <SectionTitle icon={BarChart3} title={t('analyticsTitle', language)} />
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric label={t('totalWines', language)} value={analytics.total} />
        <Metric label={t('collectionValue', language)} value={`£${analytics.value.toLocaleString()}`} />
        <Metric label={t('averageRating', language)} value={analytics.averageRating.toFixed(1)} />
        <Metric label={t('consumedYear', language)} value={analytics.consumedThisYear} />
      </div>
      <div className="mt-4 space-y-2 text-sm text-cellar-700 dark:text-linen/70">
        <p>{t('favouriteCountry', language)}: {analytics.favouriteCountry}</p>
        <p>{t('favouriteGrape', language)}: {analytics.favouriteGrape}</p>
        <p>{t('commonRegion', language)}: {analytics.commonRegion}</p>
      </div>
      <div className="mt-5 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={valueByRegion}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,180,108,0.18)" />
            <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 11 }} />
            <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1d1510', border: '1px solid rgba(217,180,108,.35)', color: '#f3eadb' }} />
            <Bar dataKey="value" fill="#d9b46c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rarityData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={64}>
              {rarityData.map((_, index) => <Cell key={index} fill={['#d9b46c', '#9b2f43', '#748064', '#c7794a', '#f3eadb'][index % 5]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: '#1d1510', border: '1px solid rgba(217,180,108,.35)', color: '#f3eadb' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
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
      {favouriteShared && (
        <div className="mt-4 border border-gold/25 bg-gold/10 p-4">
          <p className="text-sm text-gold">{language === 'zh' ? '最爱的共享酒款' : language === 'fr' ? 'Bouteille partagée favorite' : 'Favourite shared bottle'}</p>
          <p className="mt-1 font-serif text-2xl">{text(favouriteShared.name, language)}</p>
          <p className="text-sm text-cellar-700 dark:text-linen/70">{favouriteShared.sharedWith.join(', ')}</p>
        </div>
      )}
    </section>
  );
}

function WineMap({ language, wines, selectedRegion, setSelectedRegion, regionWines }: { language: Language; wines: Wine[]; selectedRegion: string; setSelectedRegion: (region: string) => void; regionWines: Wine[] }) {
  const represented = new Set(wines.map((wine) => wine.region.en));
  return (
    <section className="lux-panel">
      <SectionTitle icon={MapPinned} title={t('mapTitle', language)} />
      <div className="wine-map mt-5">
        {regions.map((region) => {
          const position = regionPositions[region];
          return (
            <button key={region} className={`map-pin ${represented.has(region) ? 'map-pin-active' : ''} ${selectedRegion === region ? 'map-pin-selected' : ''}`} style={{ left: position.x, top: position.y }} onClick={() => setSelectedRegion(region)} aria-label={region}>
              <span />
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <p className="font-serif text-xl">{selectedRegion}</p>
        <p className="text-sm text-cellar-700 dark:text-linen/70">
          {regionWines.length ? regionWines.map((wine) => text(wine.name, language)).join(' · ') : language === 'zh' ? '尚未收藏该产区酒款' : language === 'fr' ? 'Aucun vin de cette région' : 'No wines from this region yet'}
        </p>
      </div>
    </section>
  );
}

function Legacy({ wines, language }: { wines: Wine[]; language: Language }) {
  const highestRated = [...wines].sort((a, b) => averageWineRating(b) - averageWineRating(a)).slice(0, 3);
  const memorable = wines.flatMap((wine) => wine.memories.map((memory) => ({ wine, memory }))).slice(0, 4);
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="legacy-hero">
        <Crown size={30} />
        <h2>{t('legacyTitle', language)}</h2>
        <p>
          {language === 'zh'
            ? '把年份、团圆、庆祝与父子之间的心意，珍藏成可以慢慢回看的家族故事。'
            : language === 'fr'
              ? 'Préserver les millésimes, les célébrations et les gestes d’un fils pour son père comme une histoire familiale à relire.'
              : 'Preserving vintages, celebrations, and a son’s gift to his father as a family story worth returning to.'}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {highestRated.map((wine) => (
          <article key={wine.id} className="lux-panel">
            <span className="badge badge-gold">{averageWineRating(wine).toFixed(1)} ★</span>
            <h3 className="mt-3 font-serif text-2xl">{text(wine.name, language)}</h3>
            <p className="mt-2 text-sm text-cellar-700 dark:text-linen/70">{text(wine.notes, language)}</p>
          </article>
        ))}
      </div>
      {memorable.map(({ wine, memory }) => (
        <article key={memory.id} className="lux-panel">
          <p className="text-sm text-gold">{memory.date}</p>
          <h3 className="font-serif text-2xl">{text(memory.title, language)}</h3>
          <p className="mt-2 text-cellar-800 dark:text-linen/80">{text(memory.story, language)}</p>
          <p className="mt-3 text-sm text-cellar-700 dark:text-linen/70">{text(wine.name, language)}</p>
        </article>
      ))}
    </motion.section>
  );
}

function EmptyState({ language, loadPreview }: { language: Language; loadPreview: () => void }) {
  return (
    <div className="empty-state">
      <WineIcon size={42} />
      <h3>{t('emptyTitle', language)}</h3>
      <p>{t('emptyBody', language)}</p>
      <button className="primary-button" onClick={loadPreview}><Sparkles size={18} />{t('sampleData', language)}</button>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof WineIcon; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="section-icon"><Icon size={18} /></span>
      <h2 className="font-serif text-3xl">{title}</h2>
    </div>
  );
}

function Metric({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return <div className="flex text-gold">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={18} fill={index < rating ? 'currentColor' : 'none'} />)}</div>;
}

function averageWineRating(wine: Wine) {
  if (!wine.tastings.length) return 0;
  return wine.tastings.reduce((sum, tasting) => sum + tasting.rating, 0) / wine.tastings.length;
}
