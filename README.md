# The 俊毅 Collection

A premium multilingual wine cellar, tasting journal, family memory archive, and AI concierge app created as a Father's Day 2026 gift for Jay (俊毅).

## Features

- English, 简体中文, and Français interface with remembered language preference.
- Luxury responsive UI with dark mode, animated sections, and a generated cellar hero image.
- AI wine identification flow for bottle photos and wine lists, with multilingual generated details.
- Personal cellar with search, filters, sorting, rarity badges, value, drinking window, food pairing, and tasting profile.
- Tasting journal, family memory timeline, shared-with-family dashboard, analytics charts, world wine map, and Cellar Legacy page.
- Offline-friendly storage using localStorage with an in-memory fallback for private or embedded browser sessions.
- Supabase-ready image upload integration through `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Setup

```bash
npm install
npm run dev
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

Create a public storage bucket named `wine-images`. Without Supabase configuration, uploaded files still preview locally via object URLs.

## Architecture

- `src/App.tsx`: main product experience and feature sections.
- `src/lib/i18n.ts`: translation dictionary and multilingual text helpers.
- `src/types/wine.ts`: typed wine, tasting, rarity, and memory models.
- `src/hooks/useCollection.ts`: collection state, persistence, and analytics.
- `src/lib/storage.ts`: offline-first persistence with fallback behavior.
- `src/lib/ai.ts`: AI identification adapter placeholder ready to connect to a real backend endpoint.
- `src/lib/supabase.ts`: optional Supabase client and image upload helper.
- `public/service-worker.js`: app-shell cache for production offline resilience.

## Future Improvements

- Replace the local AI adapter with a secure server endpoint for image recognition and translation.
- Add authenticated family accounts in Supabase with row-level security.
- Add full CRUD forms for wines, tasting entries, and memories.
- Add export/import of the cellar archive for long-term family preservation.
- Split chart and animation libraries into lazy-loaded chunks if the collection grows into a larger app.
# Junyi-Collection
