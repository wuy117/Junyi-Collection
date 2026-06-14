# The 俊毅 Collection

A premium multilingual wine cellar, tasting journal, family memory archive, and AI concierge app created as a Father's Day 2026 gift for Jay (俊毅).

## Features

- English, 简体中文, and Français interface with remembered language preference.
- Luxury responsive UI with dark mode, animated sections, and a generated cellar hero image.
- Real AI-backed wine identification through a separate secure backend endpoint.
- Real AI-backed Cellar Concierge that answers from Jay's saved collection.
- Local cellar CRUD: add, edit, delete, search, filter, sort, and persist wine records.
- Saved bottle photos using Supabase Storage when configured, or IndexedDB/local browser storage fallback when offline.
- Real tasting notes, 1-5 ratings, occasion tags, and family memory entries attached to saved wines.
- Tasting journal, family memory timeline, shared-with-family dashboard, analytics charts, world wine map, and Cellar Legacy page.
- Offline-friendly storage using IndexedDB, localStorage, and an in-memory fallback for restricted browser sessions.
- Honest price ranges and rarity estimates without fake precision or live-market claims.

## Frontend Setup

```bash
npm install
npm run dev
```

The React app is a static frontend and can be deployed to GitHub Pages, Tencent COS static hosting, Netlify, or any CDN.

Set the AI backend base URL for frontend builds. Use the Vercel project root, not the `/api` path:

```bash
VITE_AI_API_BASE_URL=https://your-vercel-ai-backend.vercel.app
```

The frontend calls:

- `POST ${VITE_AI_API_BASE_URL}/api/identify-wine`
- `POST ${VITE_AI_API_BASE_URL}/api/cellar-concierge`

If `VITE_AI_API_BASE_URL` is not set, local development falls back to `/api`. GitHub Pages cannot run `/api/*` routes, so production GitHub Pages builds must set `VITE_AI_API_BASE_URL` to the deployed Vercel backend.

To test the frontend and Vercel API routes together locally, use Vercel's dev server:

```bash
npx vercel dev
```

For production verification:

```bash
npm run build
npm run preview
```

## Supabase

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Set:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Create a public storage bucket named `wine-images`. Without Supabase configuration, uploaded photos are stored locally in browser storage for the gift app experience.

The app does not currently use Supabase Database tables or authentication. Wine records are stored locally in the browser unless a future database layer is added.

## AI Backend Setup

AI keys must live only in backend/serverless environment variables. Never put provider keys in Vite frontend variables.

Required backend variables:

```bash
AI_PROVIDER=qwen
AI_API_KEY=your-provider-key
AI_MODEL=qwen-vl-plus
AI_ALLOWED_ORIGINS=https://wuy117.github.io
```

Optional backend variables:

```bash
AI_BASE_URL=https://provider-openai-compatible-base-url/v1
OPENAI_API_KEY=sk-...
```

Supported `AI_PROVIDER` values:

- `qwen`: defaults to DashScope OpenAI-compatible mode.
- `zhipu`: defaults to BigModel OpenAI-compatible mode.
- `baidu`: set `AI_BASE_URL` to a Baidu/Qianfan OpenAI-compatible endpoint.
- `hunyuan`: set `AI_BASE_URL` to a Hunyuan OpenAI-compatible endpoint if available for your account.
- `openai-compatible`: use any compatible provider by setting `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL`.

The backend uses an OpenAI-compatible `/chat/completions` request shape where possible. If a provider rejects strict `json_schema` response formatting, the backend retries with prompt-enforced JSON parsing so the frontend data shape stays the same.

Security rules:

- Do not add `VITE_OPENAI_API_KEY`, `VITE_QWEN_API_KEY`, or any other frontend AI key.
- Do not read AI keys from React code.
- Only backend code under `api/` or `scf/` should call the AI provider.
- Use CORS allowlists in `AI_ALLOWED_ORIGINS` for GitHub Pages/COS domains.

## GitHub Pages Frontend Deployment

1. Deploy the AI backend to Vercel first.
2. Set `VITE_AI_API_BASE_URL` in the GitHub Pages build environment to the Vercel backend root URL:

```bash
VITE_AI_API_BASE_URL=https://your-vercel-project.vercel.app
```

3. Build the static app:

```bash
npm run build
```

4. Deploy `dist/` to GitHub Pages.

Important: GitHub Pages serves static files only. It cannot run `/api/identify-wine` or `/api/cellar-concierge`; those routes are hosted by Vercel.

## Vercel AI Backend Deployment

Deploy only the AI backend to Vercel while keeping the frontend on GitHub Pages.

The Vercel backend exposes:

- `POST /api/identify-wine`
- `POST /api/cellar-concierge`
- `OPTIONS /api/identify-wine`
- `OPTIONS /api/cellar-concierge`

Deployment steps:

1. Create a new Vercel project from this repository.
2. Set the project root to this folder.
3. Add environment variables in Vercel Project Settings.

For OpenAI:

```bash
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-5.5
AI_ALLOWED_ORIGINS=https://wuy117.github.io
```

For Qwen / DashScope OpenAI-compatible mode:

```bash
AI_PROVIDER=qwen
AI_API_KEY=your-dashscope-api-key
AI_MODEL=qwen-vl-plus
AI_ALLOWED_ORIGINS=https://wuy117.github.io
```

4. Deploy to Vercel.
5. Confirm these URLs exist:

```bash
https://your-vercel-project.vercel.app/api/identify-wine
https://your-vercel-project.vercel.app/api/cellar-concierge
```

6. In the GitHub Pages frontend build, set:

```bash
VITE_AI_API_BASE_URL=https://your-vercel-project.vercel.app
```

The Vercel routes add CORS headers for `https://wuy117.github.io` by default. To allow preview domains or another frontend host, set:

```bash
AI_ALLOWED_ORIGINS=https://wuy117.github.io,https://your-preview-domain.example.com
```

The file `vercel.json` sets a 30-second max duration for the AI routes.

## Tencent SCF Backend Deployment

Tencent SCF remains available as an alternative if authentication is fixed later. This repository includes Tencent Cloud Function style handlers:

- `scf/identify-wine/index.js`
- `scf/cellar-concierge/index.js`
- `scf/shared/ai-provider.js`

Create two SCF functions:

1. Function name: `identify-wine`
   - Runtime: Node.js 18 or newer.
   - Entry file: `index.js`.
   - Handler: `index.main`.
   - Deployment package: copy `scf/identify-wine/index.js` to the function root as `index.js`, and copy `scf/shared/` to the function root as `shared/`.

2. Function name: `cellar-concierge`
   - Runtime: Node.js 18 or newer.
   - Entry file: `index.js`.
   - Handler: `index.main`.
   - Deployment package: copy `scf/cellar-concierge/index.js` to the function root as `index.js`, and copy `scf/shared/` to the function root as `shared/`.

Expose both functions through API Gateway paths:

- `POST /identify-wine`
- `POST /cellar-concierge`
- `OPTIONS /identify-wine`
- `OPTIONS /cellar-concierge`

Set backend environment variables in SCF:

```bash
AI_PROVIDER=qwen
AI_API_KEY=your-qwen-or-provider-key
AI_MODEL=qwen-vl-plus
AI_ALLOWED_ORIGINS=https://wuy117.github.io,https://your-cos-domain.example.com
```

For providers that need an explicit compatible endpoint:

```bash
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://your-provider.example.com/v1
AI_API_KEY=your-key
AI_MODEL=your-vision-capable-model
```

The SCF handlers add CORS response headers automatically. Keep `AI_ALLOWED_ORIGINS` narrow in production.

## Current Status

### Fully Working Now

- Language switching between English, 简体中文, and Français, with remembered preference.
- Dark mode, responsive mobile-first layout, and premium visual styling.
- Add, edit, delete, search, filter, and sort wine records.
- Save bottle photos locally via IndexedDB/local browser storage, or upload to Supabase Storage if environment variables and the `wine-images` bucket are configured.
- Add tasting notes, 1-5 ratings, personal impressions, and occasion tags to saved wines.
- Add family memory entries with date, location, people present, and story.
- Local persistence for collection data, journal entries, memories, preferences, and locally saved photos.
- Analytics, family sharing summaries, world wine map highlighting, and Cellar Legacy views based on the saved local collection.
- AI wine identification through `${VITE_AI_API_BASE_URL}/api/identify-wine`, returning editable structured fields including confidence, visible label text, price range, rarity estimate, warnings, and uncertainty.
- AI Cellar Concierge through `${VITE_AI_API_BASE_URL}/api/cellar-concierge`, answering from the saved collection data in the selected language.

### Partially Working

- Supabase upload: storage upload works when configured, but there is no Supabase auth, database schema, or row-level security yet.
- Offline support: production builds include an app-shell service worker and local data persistence, but full conflict sync is not implemented.
- Multilingual wine data: manually entered wines are displayed in all three language modes, but user-entered wine text is not professionally translated.

### Demo / Placeholder

- Market value and rarity are AI/user estimates, not live data from a wine marketplace or rarity database.
- Gift preview content is sample data and should be treated as a removable demonstration.

## Architecture

- `src/App.tsx`: main product experience and feature sections.
- `src/lib/i18n.ts`: translation dictionary and multilingual text helpers.
- `src/types/wine.ts`: typed wine, tasting, rarity, and memory models.
- `src/hooks/useCollection.ts`: collection state, persistence, and analytics.
- `src/lib/storage.ts`: offline-first persistence with fallback behavior.
- `src/lib/ai.ts`: frontend API client for secure AI backend routes.
- `src/lib/supabase.ts`: optional Supabase client and image upload helper.
- `api/identify-wine.ts`: Vercel-style server-only AI endpoint for wine identification.
- `api/cellar-concierge.ts`: Vercel-style server-only AI endpoint for cellar recommendations.
- `api/_openai.ts`: shared provider-configurable OpenAI-compatible helper.
- `scf/identify-wine/index.js`: Tencent SCF function for wine identification.
- `scf/cellar-concierge/index.js`: Tencent SCF function for cellar recommendations.
- `scf/shared/ai-provider.js`: provider-configurable SCF AI helper with CORS.
- `public/service-worker.js`: app-shell cache for production offline resilience.

## Future Improvements

- Connect a real wine pricing source for market ranges, drinking windows, and rarity signals.
- Add authenticated family accounts in Supabase with a production database schema and row-level security.
- Sync local IndexedDB records to Supabase with conflict handling and backup/export.
- Add export/import of the cellar archive for long-term family preservation.
- Split chart and animation libraries into lazy-loaded chunks if the collection grows into a larger app.
