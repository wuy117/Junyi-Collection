import { makeText } from './i18n';
import type { Language, TranslationText, Wine } from '../types/wine';

const dictionary: Record<Language, Record<string, string>> = {
  en: {
    generated: 'Generated from the uploaded image. Review details before saving.',
  },
  zh: {
    generated: '根据上传图片生成。保存前请核对信息。',
  },
  fr: {
    generated: 'Généré à partir de l’image importée. Vérifiez les détails avant enregistrement.',
  },
};

export function translateAiDescription(source: string): TranslationText {
  return makeText(
    source,
    `AI 翻译：${source}`,
    `Traduction IA : ${source}`,
  );
}

export function identifyWineFromUpload(fileName: string): Wine {
  const lowered = fileName.toLowerCase();
  const isChampagne = lowered.includes('champagne') || lowered.includes('krug');
  const region = isChampagne ? makeText('Champagne', '香槟区', 'Champagne') : makeText('Bordeaux', '波尔多', 'Bordeaux');
  const style = isChampagne ? 'sparkling' : 'red';

  return {
    id: crypto.randomUUID(),
    photo: '',
    name: isChampagne ? makeText('Identified Champagne', '识别出的香槟', 'Champagne identifié') : makeText('Identified Bordeaux', '识别出的波尔多', 'Bordeaux identifié'),
    producer: isChampagne ? 'Maison producer pending' : 'Château producer pending',
    vintage: '2018',
    country: makeText('France', '法国', 'France'),
    region,
    grape: isChampagne ? makeText('Chardonnay, Pinot Noir', '霞多丽、黑皮诺', 'Chardonnay, pinot noir') : makeText('Cabernet Sauvignon blend', '赤霞珠混酿', 'Assemblage cabernet sauvignon'),
    style,
    estimatedValue: isChampagne ? 180 : 95,
    drinkingWindow: makeText('Now–2035', '现在–2035 年', 'Maintenant–2035'),
    tastingProfile: translateAiDescription(isChampagne ? 'Citrus, toast, fine bubbles, bright acidity.' : 'Dark fruit, cedar, spice, firm tannins.'),
    foodPairings: isChampagne ? makeText('Seafood, roast chicken, soft cheeses.', '海鲜、烤鸡、软质奶酪。', 'Fruits de mer, poulet rôti, fromages doux.') : makeText('Steak, lamb, mushroom dishes.', '牛排、羊排、蘑菇菜肴。', 'Bœuf, agneau, plats aux champignons.'),
    facts: makeText(dictionary.en.generated, dictionary.zh.generated, dictionary.fr.generated),
    dateAdded: new Date().toISOString().slice(0, 10),
    notes: makeText('Imported by AI identification.', '由 AI 识别导入。', 'Importé par identification IA.'),
    location: 'Review shelf',
    rarity: 'uncommon',
    consumed: false,
    sharedWith: ['Jay'],
    tastings: [],
    memories: [],
  };
}
