# sat-facil (MVP)

Single Next.js codebase with one shared backend (`SAT Brain`) powering:
- Mobile-first web app (chat + guided flows)
- WhatsApp bot endpoint (Twilio webhook)

## Stack
- Next.js (App Router) + TypeScript
- Supabase Postgres + pgvector (`@supabase/supabase-js`)
- OpenAI API (chat + embeddings, server-side)
- Tailwind CSS
- Vitest (unit tests)

## Safety Rules Implemented
- Educational assistant only, not definitive tax advice.
- Refuses tax evasion / falsifying documents and redirects to legal alternatives.
- If message mentions `multa`, `requerimiento`, `auditoría`, `crédito fiscal`, adds recommendation to consult a professional.
- Responds with:
  - structured output,
  - `Nivel de confianza: Alta/Media/Baja`,
  - SAT/gob.mx sources when available.
- If retrieval support is insufficient, says so and asks up to 2 clarifying questions.

## MVP Features
- Home page with input + 4 flow buttons (`Facturar`, `RESICO`, `Buzón`, `Devolución`)
- Chat page with:
  - conversation thread
  - quick actions (`Dame pasos`, `Haz checklist`, `Genera mensaje`)
  - history (last 10 sessions per local user)
- Flow wizard pages for IDs:
  - `FACTURAR`
  - `RESICO`
  - `BUZON`
  - `DEVOLUCION`
- Usage limit (free): 5 messages/day per `user_id` in DB.
- Twilio-compatible WhatsApp webhook at `/api/whatsapp`.

## Environment Variables
Copy `.env.example` to `.env.local` and fill:

```bash
cp .env.example .env.local
```

Required for MVP:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Optional:
- `OPENAI_CHAT_MODEL` (default `gpt-4.1-mini`)
- `OPENAI_EMBEDDING_MODEL` (default `text-embedding-3-small`)
- `SAT_OFFICIAL_DOC_URLS_<TARGET_KEY>` (comma-separated official downloadable URLs per target, e.g. `SAT_OFFICIAL_DOC_URLS_ANEXO_20=...`)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_ENABLE_PAYMENTS=false` (payments are stubbed/flagged)

## Setup
1. Install dependencies:

```bash
npm install
```

2. Run Supabase migrations (local or linked project):

```bash
supabase db push
```

This applies:
- existing project migrations
- `supabase/migrations/20260303_sat_facil_mvp.sql` (SAT tables, pgvector index, retrieval function, default flows)

3. Seed knowledge base:

```bash
npm run seed:kb
```

This runs the SAT ingestion pipeline (`scripts/crawl_sat.ts` via `scripts/seed_kb.ts`) with:
- local PDF preference (`sat_sources/pdfs/*.pdf`)
- official downloadable docs (when configured/discoverable)
- HTML fallback only when not blocked
- idempotent re-ingestion (skips unchanged sources)

It writes embedded chunks into:
- `kb_sources`
- `kb_chunks`

Optional direct command:

```bash
npm run ingest:sat
```

4. Start dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints (SAT Brain)
- `POST /api/chat`
  - body: `{ user_id, session_id, channel, message }`
- `POST /api/flow/start`
  - body: `{ user_id, session_id, flow_id, channel }`
- `POST /api/flow/answer`
  - body: `{ user_id, session_id, flow_id, question_id, answer, channel }`
- `POST /api/template`
  - body: `{ case_summary, template_type }`
- `POST /api/whatsapp`
  - Twilio inbound webhook (`application/x-www-form-urlencoded`)

## Twilio WhatsApp Local Test
1. Run app locally:

```bash
npm run dev
```

2. Expose local server (example ngrok):

```bash
ngrok http 3000
```

3. In Twilio Console, set WhatsApp incoming webhook URL to:

```txt
https://<your-ngrok-domain>/api/whatsapp
```

4. Send WhatsApp message:
- `hola` -> menu
- `1`..`4` -> starts flow
- any other text -> generic SAT chat

## Tests
Run unit tests:

```bash
npm test
```

Includes:
- router classification test
- flow progression test

Run lint/typecheck:

```bash
npm run lint
npm run typecheck
```

## Project Paths (new SAT MVP code)
- `src/lib/sat/*` shared SAT Brain logic (router, RAG, safety, flows, formatting)
- `src/app/api/chat/route.ts`
- `src/app/api/flow/start/route.ts`
- `src/app/api/flow/answer/route.ts`
- `src/app/api/template/route.ts`
- `src/app/api/whatsapp/route.ts`
- `src/app/chat/*`
- `src/app/flow/[flowId]/*`
- `scripts/seed_kb.ts`
- `supabase/migrations/20260303_sat_facil_mvp.sql`
