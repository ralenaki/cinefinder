# CineFinder

A responsive movie discovery web app built with vanilla HTML, CSS, and JavaScript, backed by a lightweight Vercel serverless API proxy to keep TMDB credentials off the client.

**Live Demo:** [Add your Vercel URL here]

## Architecture & API Security

Static frontend apps cannot safely store private API keys in browser JavaScript or expose `.env` files to the client. To solve this cleanly without maintaining a full backend server:

```text
Browser (script.js)  ──►  /api/movies (Vercel Serverless Function)  ──►  TMDB REST API
                                   ▲
                     process.env.TMDB_API_KEY (hidden)
```

- All movie queries (popular, genre discovery, live search, pagination, and single-title metadata) go through `/api/movies`.
- `TMDB_API_KEY` is stored strictly in environment variables (excluded from Git via `.gitignore`, documented in `.env.example`).
- Responses include edge caching headers (`Cache-Control: s-maxage=300, stale-while-revalidate`) to reduce redundant upstream requests.
- Query parameters (`id`, `genre`, `page`) are validated and clamped before forwarding to TMDB.

## Features

- **Debounced Live Search:** Waits 350ms after typing stops before hitting `/api/movies?q=...` to avoid spamming requests on every keystroke.
- **Genre Filtering & Pagination:** Browse popular films or filter by genre with Previous/Next pagination across TMDB's catalog.
- **Accessible Detail Modal:** Built on the native HTML `<dialog>` element (supports keyboard navigation, `Esc`, and backdrop dismissal) and lazily loads runtime + full genre metadata on open.
- **Persistent Watchlist:** Stores saved titles in `localStorage` with instant count updates.
- **Mobile-First Responsive Grid:** Adapts cleanly across desktop, tablet, and mobile viewports.

## Project Structure

```text
├── api/
│   └── movies.js     # Serverless proxy for TMDB requests
├── index.html        # Semantic markup + native <dialog> modal
├── style.css         # Responsive dark UI (CSS Grid, Flexbox, aspect-ratio)
├── script.js         # Client state, debounced search, pagination, localStorage
├── .env.example      # Required environment variable template
└── .gitignore        # Excludes .env files and local config
```

## Running Locally & Deploying

1. Get a free API key from [TMDB Settings](https://www.themoviedb.org/settings/api).
2. Create a `.env` file in the root (ignored by Git) using `.env.example`:

```env
TMDB_API_KEY=your_key_here
```

3. Run locally with the Vercel CLI (`vercel dev`), or deploy directly by importing the repository in [Vercel](https://vercel.com/) and adding `TMDB_API_KEY` under **Project Settings → Environment Variables**.