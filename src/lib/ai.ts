import type { Language, Rarity, WineStyle } from '../types/wine';

const AI_API_BASE_URL = (import.meta.env.VITE_AI_API_BASE_URL || '/api').replace(/\/$/, '');

export interface AiWineIdentification {
  wineName: string;
  producer: string;
  vintage: string;
  region: string;
  country: string;
  grapeVarieties: string;
  wineStyle: WineStyle;
  confidenceScore: number;
  visibleLabelText: string;
  estimatedPriceRange: string;
  rarityLevel: Rarity;
  drinkingWindow: string;
  tastingProfile: string;
  foodPairings: string;
  interestingFacts: string;
  warningsOrUncertainty: string;
}

export interface ConciergeResponse {
  answer: string;
  suggestedWineIds: string[];
  warningsOrUncertainty: string;
}

export async function identifyWineImage(file: File, language: Language): Promise<AiWineIdentification> {
  const imageDataUrl = await readFileAsDataUrl(file);
  const response = await fetch(aiEndpoint('/identify-wine'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageDataUrl,
      fileName: file.name,
      preferredLanguage: language,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || 'AI service unavailable. Please try again later.');
  }
  return data as AiWineIdentification;
}

export async function askCellarConcierge(question: string, wines: WineSummary[], language: Language): Promise<ConciergeResponse> {
  const response = await fetch(aiEndpoint('/cellar-concierge'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      collection: wines,
      preferredLanguage: language,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || 'AI service unavailable. Please try again later.');
  }
  return data as ConciergeResponse;
}

export type WineSummary = {
  id: string;
  name: string;
  producer: string;
  vintage: string;
  country: string;
  region: string;
  grape: string;
  style: string;
  estimatedPriceRange?: string;
  estimatedValue?: number;
  drinkingWindow: string;
  rating: number;
  notes: string;
  location: string;
  rarity: string;
  favourite?: boolean;
  sharedWith: string[];
  tastings: Array<{ rating: number; notes: string; tags: string[]; date: string }>;
  memories: Array<{ title: string; story: string; people: string[]; date: string }>;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function aiEndpoint(path: string) {
  if (AI_API_BASE_URL.endsWith('/api')) return `${AI_API_BASE_URL}${path}`;
  return `${AI_API_BASE_URL}/api${path}`;
}
