const { callAiJson, jsonResponse, languageName, parseBody, validateLanguage } = loadProvider();

function loadProvider() {
  try {
    return require('../shared/ai-provider');
  } catch {
    return require('./shared/ai-provider');
  }
}

const conciergeSchema = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    suggestedWineIds: {
      type: 'array',
      items: { type: 'string' },
    },
    warningsOrUncertainty: { type: 'string' },
  },
  required: ['answer', 'suggestedWineIds', 'warningsOrUncertainty'],
  additionalProperties: false,
};

exports.main = async (event) => {
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return jsonResponse(event, 204, {});
  }

  try {
    const body = parseBody(event);
    const language = validateLanguage(body.preferredLanguage);
    const question = String(body.question || '').trim();
    const collection = Array.isArray(body.collection) ? body.collection : [];

    if (!question) {
      return jsonResponse(event, 400, { error: 'A cellar question is required.' });
    }

    const result = await callAiJson({
      schemaName: 'cellar_concierge_answer',
      schema: conciergeSchema,
      messages: [
        {
          role: 'system',
          content: [
            'You are Jay’s private cellar concierge: elegant, practical, and honest.',
            `Answer in ${languageName(language)}.`,
            'Base recommendations only on the collection JSON supplied by the user.',
            'If collection data is insufficient, say so clearly and suggest what information to add.',
            'Do not pretend to know live market prices. Treat any estimated values or price ranges as saved user estimates.',
            'When relevant, reference saved ratings, drinking windows, pairings, memories, shared-with-family data, and rarity estimates.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({ question, collection }),
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
