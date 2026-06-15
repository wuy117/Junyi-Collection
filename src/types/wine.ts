export type Language = 'en' | 'zh' | 'fr';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'veryRare' | 'collectible';

export type WineStyle = 'red' | 'white' | 'sparkling' | 'rose' | 'sweet' | 'fortified';

export interface TranslationText {
  en: string;
  zh: string;
  fr: string;
}

export interface Memory {
  id: string;
  date: string;
  title: TranslationText;
  story: TranslationText;
  location: string;
  people: string[];
  photos: string[];
}

export interface TastingEntry {
  id: string;
  date: string;
  rating: number;
  notes: TranslationText;
  impressions: TranslationText;
  tags: string[];
}

export interface Wine {
  id: string;
  photo?: string;
  name: TranslationText;
  producer: string;
  vintage: string;
  country: TranslationText;
  region: TranslationText;
  grape: TranslationText;
  style: WineStyle;
  estimatedValue: number;
  estimatedPriceRange?: string;
  confidenceScore?: number;
  visibleLabelText?: string;
  warningsOrUncertainty?: string;
  drinkingWindow: TranslationText;
  tastingProfile: TranslationText;
  foodPairings: TranslationText;
  facts: TranslationText;
  dateAdded: string;
  notes: TranslationText;
  location: string;
  rarity: Rarity;
  consumed: boolean;
  favourite?: boolean;
  sharedWith: string[];
  tastings: TastingEntry[];
  memories: Memory[];
}
