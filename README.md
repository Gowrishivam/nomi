# Memory

A dark, calm frontend prototype for a personal memory and journaling companion. Built with React, TypeScript, Vite, Tailwind CSS, and Lucide React.

## Run locally

```sh
npm install
npm run dev
```

Set `VITE_API_BASE_URL` in a local `.env` file when connecting a backend. The example is in `.env.example`. `npm run build` creates a production build.

## Product structure

- `src/App.tsx` composes the persistent shell and independent feature views.
- `src/types.ts` holds API-aligned domain types.
- `src/services/` isolates mock data and async operations from the UI. `apiClient.ts` is the centralized REST boundary for a future FastAPI implementation.
- `src/styles.css` contains the shared design system and responsive layouts.

The current prototype uses realistic fictional demo data. It does not record audio or provide real AI, authentication, encryption, or privacy guarantees. Recording and processing are simulated, and saved demo entries remain in in-memory service state for this session.

## Main demo flow

Home → Talk about today → Recording → Processing → Four findings → Diary / Memories → Ask AI with sources → Timeline → Insights.

Secondary destinations (Goals, Experiences, People, Projects, Tasks, and Settings) are modular, lightweight supporting pages.
