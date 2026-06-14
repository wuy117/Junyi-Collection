import { callOpenAIJson, languageName, methodNotAllowed, PublicApiError, readJsonBody, sendJson, validateLanguage } from './_openai.js';

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

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {}, req);
  if (req.method !== 'POST') return methodNotAllowed(res, req);

  try {
    const body = await readJsonBody(req);
    const language = validateLanguage(body.preferredLanguage);
    const question = String(body.question || '').trim();
    const collection = Array.isArray(body.collection) ? body.collection : [];

    if (!question) {
      return sendJson(res, 400, { error: 'A cellar question is required.' }, req);
    }

    const result = await callOpenAIJson({
      schemaName: 'cellar_concierge_answer',
      schema: conciergeSchema,
      input: [
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
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({
                question,
                collection,
              }),
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
