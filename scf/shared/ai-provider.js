const DEFAULT_PROVIDER = 'qwen';
const PROVIDER_DEFAULTS = {
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-vl-plus' },
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4v-plus' },
  baidu: { model: 'ernie-4.5-turbo-vl' },
  hunyuan: { model: 'hunyuan-turbos-vision' },
  'openai-compatible': { baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.5' },
};

function corsHeaders(event) {
  const origin = event?.headers?.origin || event?.headers?.Origin || '*';
  const allowed = (process.env.AI_ALLOWED_ORIGINS || '*').split(',').map((item) => item.trim());
  const allowOrigin = allowed.includes('*') || allowed.includes(origin) ? origin : allowed[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };
}

function jsonResponse(event, statusCode, body) {
  return {
    isBase64Encoded: false,
    statusCode,
    headers: corsHeaders(event),
    body: statusCode === 204 ? '' : JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event?.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  return typeof raw === 'string' ? JSON.parse(raw || '{}') : raw;
}

function validateLanguage(value) {
  return value === 'zh' || value === 'fr' ? value : 'en';
}

function languageName(language) {
  if (language === 'zh') return 'Simplified Chinese';
  if (language === 'fr') return 'French';
  return 'English';
}

async function callAiJson({ schemaName, schema, messages }) {
  const { baseUrl, model, apiKey } = getAiConfig();
  const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const requestBody = {
    model,
    messages: messages.map((message) => ({
      ...message,
      content: Array.isArray(message.content) ? prependSchema(message.content, schema) : `${message.content}\nReturn valid JSON matching this schema: ${JSON.stringify(schema)}`,
    })),
    temperature: 0.2,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: schemaName,
        schema,
        strict: true,
      },
    },
  };

  let response = await postProvider(endpoint, apiKey, requestBody);
  let payload = await response.json().catch(() => null);

  if (!response.ok && shouldRetryWithoutJsonSchema(response.status, payload)) {
    response = await postProvider(endpoint, apiKey, { ...requestBody, response_format: undefined });
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || 'AI service unavailable. Please try again later.';
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  const output = extractText(payload);
  if (!output) {
    const error = new Error('AI service returned an empty response.');
    error.statusCode = 502;
    throw error;
  }

  return JSON.parse(cleanJson(output));
}

function getAiConfig() {
  const provider = process.env.AI_PROVIDER || DEFAULT_PROVIDER;
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS['openai-compatible'];
  const baseUrl = process.env.AI_BASE_URL || defaults.baseUrl;
  const model = process.env.AI_MODEL || defaults.model;
  const apiKey = process.env.AI_API_KEY || providerSpecificKey(provider) || process.env.OPENAI_API_KEY;

  if (!baseUrl) {
    const error = new Error(`AI_BASE_URL is required for AI_PROVIDER=${provider}.`);
    error.statusCode = 500;
    throw error;
  }
  if (!apiKey) {
    const error = new Error('AI_API_KEY is not configured.');
    error.statusCode = 500;
    throw error;
  }

  return { provider, baseUrl, model, apiKey };
}

function providerSpecificKey(provider) {
  const keyName = `${provider.toUpperCase().replace(/-/g, '_')}_API_KEY`;
  return process.env[keyName];
}

async function postProvider(endpoint, apiKey, body) {
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function prependSchema(content, schema) {
  return [
    { type: 'text', text: `Return only valid JSON matching this schema: ${JSON.stringify(schema)}` },
    ...content,
  ];
}

function shouldRetryWithoutJsonSchema(status, payload) {
  const message = `${payload?.error?.message || payload?.message || ''}`.toLowerCase();
  return status === 400 && (message.includes('response_format') || message.includes('json_schema'));
}

function extractText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((part) => part?.text || part?.content || '').join('');
  return '';
}

function cleanJson(value) {
  return value.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

module.exports = {
  callAiJson,
  jsonResponse,
  languageName,
  parseBody,
  validateLanguage,
};
