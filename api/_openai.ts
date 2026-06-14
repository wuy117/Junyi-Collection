const DEFAULT_PROVIDER = 'openai-compatible';
declare const Buffer: any;
declare const process: any;

const PROVIDER_DEFAULTS: Record<string, { baseUrl?: string; model: string }> = {
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-vl-plus' },
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4v-plus' },
  baidu: { model: 'ernie-4.5-turbo-vl' },
  hunyuan: { model: 'hunyuan-turbos-vision' },
  'openai-compatible': { baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.5' },
};

export type Language = 'en' | 'zh' | 'fr';

type JsonSchema = Record<string, unknown>;

export async function readJsonBody(req: any) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

  const chunks: any[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export function sendJson(res: any, status: number, body: unknown, req?: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', corsOrigin(req));
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  res.end(status === 204 ? '' : JSON.stringify(body));
}

export function methodNotAllowed(res: any, req?: any) {
  sendJson(res, 405, { error: 'Method not allowed.' }, req);
}

export function validateLanguage(value: unknown): Language {
  return value === 'zh' || value === 'fr' ? value : 'en';
}

export function languageName(language: Language) {
  if (language === 'zh') return 'Simplified Chinese';
  if (language === 'fr') return 'French';
  return 'English';
}

export async function callOpenAIJson<T>({
  input,
  schema,
  schemaName,
}: {
  input: unknown[];
  schema: JsonSchema;
  schemaName: string;
}): Promise<T> {
  const { baseUrl, model, apiKey } = getAiConfig();
  const messages = toChatMessages(input, schema);
  const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const requestBody = {
    model,
    messages,
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
    throw new PublicApiError(message, response.status);
  }

  const outputText = extractChatText(payload);
  if (!outputText) {
    throw new PublicApiError('AI service returned an empty response.', 502);
  }

  return JSON.parse(cleanJson(outputText)) as T;
}

export class PublicApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function getAiConfig() {
  const provider = process.env.AI_PROVIDER || DEFAULT_PROVIDER;
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS['openai-compatible'];
  const baseUrl = process.env.AI_BASE_URL || defaults.baseUrl;
  const model = process.env.AI_MODEL || defaults.model;
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || providerSpecificKey(provider);

  if (!baseUrl) {
    throw new PublicApiError(`AI_BASE_URL is required for AI_PROVIDER=${provider}.`, 500);
  }
  if (!apiKey) {
    throw new PublicApiError('AI_API_KEY is not configured.', 500);
  }

  return { provider, baseUrl, model, apiKey };
}

function providerSpecificKey(provider: string) {
  const keyName = `${provider.toUpperCase().replace(/-/g, '_')}_API_KEY`;
  return process.env[keyName];
}

function toChatMessages(input: unknown[], schema: JsonSchema) {
  return input.map((item: any) => {
    if (item.role === 'system') {
      return { role: 'system', content: stringifyContent(item.content) };
    }
    return {
      role: item.role || 'user',
      content: normalizeUserContent(item.content, schema),
    };
  });
}

function stringifyContent(content: unknown) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content || '');
  return content.map((part: any) => part?.text || part?.content || '').filter(Boolean).join('\n');
}

function normalizeUserContent(content: unknown, schema: JsonSchema) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content || '');

  const normalized = content.map((part: any) => {
    if (part.type === 'input_text') return { type: 'text', text: part.text };
    if (part.type === 'input_image') return { type: 'image_url', image_url: { url: part.image_url } };
    return part;
  });

  normalized.unshift({
    type: 'text',
    text: `Return only valid JSON matching this schema: ${JSON.stringify(schema)}`,
  });
  return normalized;
}

async function postProvider(endpoint: string, apiKey: string, body: unknown) {
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function shouldRetryWithoutJsonSchema(status: number, payload: any) {
  const message = `${payload?.error?.message || payload?.message || ''}`.toLowerCase();
  return status === 400 && (message.includes('response_format') || message.includes('json_schema'));
}

function extractChatText(payload: any) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => part?.text || part?.content || '').join('');
  }
  return '';
}

function cleanJson(value: string) {
  return value.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

function corsOrigin(req?: any) {
  const configured = process.env.AI_ALLOWED_ORIGINS || 'https://wuy117.github.io';
  if (configured === '*') return '*';

  const allowed = configured.split(',').map((origin) => origin.trim()).filter(Boolean);
  const requestOrigin = req?.headers?.origin || req?.headers?.Origin;
  if (requestOrigin && allowed.includes(requestOrigin)) return requestOrigin;
  return allowed[0] || 'https://wuy117.github.io';
}
