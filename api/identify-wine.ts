import { callOpenAIJson, languageName, methodNotAllowed, PublicApiError, readJsonBody, sendJson, validateLanguage } from './_openai.js';

const wineSchema = {
  type: 'object',
  properties: {
    wineName: { type: 'string' },
    producer: { type: 'string' },
    vintage: { type: 'string' },
    region: { type: 'string' },
    country: { type: 'string' },
    grapeVarieties: { type: 'string' },
    wineStyle: { type: 'string', enum: ['red', 'white', 'sparkling', 'rose', 'sweet', 'fortified'] },
    confidenceScore: { type: 'number', minimum: 0, maximum: 1 },
    visibleLabelText: { type: 'string' },
    estimatedPriceRange: { type: 'string' },
    rarityLevel: { type: 'string', enum: ['common', 'uncommon', 'rare', 'veryRare', 'collectible'] },
    drinkingWindow: { type: 'string' },
    tastingProfile: { type: 'string' },
    foodPairings: { type: 'string' },
    interestingFacts: { type: 'string' },
    warningsOrUncertainty: { type: 'string' },
  },
  required: [
    'wineName',
    'producer',
    'vintage',
    'region',
    'country',
    'grapeVarieties',
    'wineStyle',
    'confidenceScore',
    'visibleLabelText',
    'estimatedPriceRange',
    'rarityLevel',
    'drinkingWindow',
    'tastingProfile',
    'foodPairings',
    'interestingFacts',
    'warningsOrUncertainty',
  ],
  additionalProperties: false,
};

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {}, req);
  if (req.method !== 'POST') return methodNotAllowed(res, req);

  try {
    const body = await readJsonBody(req);
    const language = validateLanguage(body.preferredLanguage);
    const imageDataUrl = String(body.imageDataUrl || '');

    if (!imageDataUrl.startsWith('data:image/')) {
      return sendJson(res, 400, { error: 'A wine bottle or wine list image is required.' }, req);
    }

    const result = await callOpenAIJson({
      schemaName: 'wine_identification',
      schema: wineSchema,
      input: [
        {
          role: 'system',
          content: [
            'You are a meticulous wine-label analyst and sommelier.',
            `Return every descriptive field in ${languageName(language)}.`,
            'Extract only what is visible or strongly inferable from the image.',
            'If the image is unclear, incomplete, or not a wine label/list, make uncertainty obvious.',
            'Never invent exact prices or imply live market data. Use broad estimated price ranges such as "£40-£70", "Unknown", or "Needs manual research".',
            'If the vintage is not visible or uncertain, set vintage to "Unknown", set drinkingWindow to "Depends on vintage", lower confidenceScore by at least 0.15, and mention that the user should enter the vintage.',
            'Do not provide a precise drinking window when vintage is unknown.',
            'For rarity, use a cautious estimate based on label cues only.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Identify this wine bottle or restaurant wine list entry. Return structured JSON only.',
            },
            {
              type: 'input_image',
              image_url: imageDataUrl,
            },
          ],
        },
      ],
    });

    return sendJson(res, 200, result, req);
  } catch (error) {
    const status = error instanceof PublicApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'AI service unavailable. Please try again later.';
    return sendJson(res, status, { error: message }, req);
  }
}
