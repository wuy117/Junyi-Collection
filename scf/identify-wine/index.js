const { callAiJson, jsonResponse, languageName, parseBody, validateLanguage } = loadProvider();

function loadProvider() {
  try {
    return require('../shared/ai-provider');
  } catch {
    return require('./shared/ai-provider');
  }
}

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

exports.main = async (event) => {
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return jsonResponse(event, 204, {});
  }

  try {
    const body = parseBody(event);
    const language = validateLanguage(body.preferredLanguage);
    const imageDataUrl = String(body.imageDataUrl || '');

    if (!imageDataUrl.startsWith('data:image/')) {
      return jsonResponse(event, 400, { error: 'A wine bottle or wine list image is required.' });
    }

    const result = await callAiJson({
      schemaName: 'wine_identification',
      schema: wineSchema,
      messages: [
        {
          role: 'system',
          content: [
            'You are a meticulous wine-label analyst and sommelier.',
            `Return every descriptive field in ${languageName(language)}.`,
            'Extract only what is visible or strongly inferable from the image.',
            'If the image is unclear, incomplete, or not a wine label/list, make uncertainty obvious.',
            'Never invent exact prices or imply live market data. Use broad estimated price ranges such as "¥300-¥600", "£40-£70", "Unknown", or "Needs manual research".',
            'If the vintage is not visible or uncertain, set vintage to "Unknown", set drinkingWindow to "Depends on vintage", lower confidenceScore by at least 0.15, and mention that the user should enter the vintage.',
            'Do not provide a precise drinking window when vintage is unknown.',
            'For rarity, use a cautious estimate based on label cues only.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Identify this wine bottle or restaurant wine list entry.' },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
    });

    return jsonResponse(event, 200, result);
  } catch (error) {
    return jsonResponse(event, error.statusCode || 500, {
      error: error.message || 'AI service unavailable. Please try again later.',
    });
  }
};
